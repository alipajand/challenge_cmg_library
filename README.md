# sensor-qc

A TypeScript library that reads a 365-Widgets quality-control log and classifies each sensor, plus a
small React page that uses it.

```ts
import { evaluateLogFile } from 'sensor-qc';

evaluateLogFile(logContentsStr);
// { "temp-1": "precise", "temp-2": "ultra precise", "hum-1": "keep", "hum-2": "discard", ... }
```

`evaluateLogStream(stream)` does the same for a `ReadableStream<string>` and returns a promise.
Both fail with a plain `Error` whose message starts with the line number, such as
`Line 3: "hot" is not a number.` The `Classification` type is exported as well.

## Setup

You need Node 24 or later. I used Node 24.11 and npm 11.19. Run `npm install`, and
`npx playwright install chromium` if you want to run the end-to-end test.

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run build:lib` | Compiles `src/` to `dist/`, the only folder the package ships |
| `npm test`          | Jest: library tests in Node, demo tests in jsdom              |
| `npm run test:e2e`  | Playwright and axe against the demo in Chromium               |
| `npm run typecheck` | TypeScript over the library, demo, tests and config           |
| `npm run lint`      | ESLint with the TypeScript, React Hooks and jsx-a11y rules    |
| `npm run dev`       | Starts the demo at http://localhost:5173                      |
| `npm run storybook` | Component stories with the accessibility addon                |

The library has no runtime dependencies. The demo uses React 19.3. Tooling: TypeScript 6.0,
Vite 8.3, Jest 30.5 with `@swc/jest`, Testing Library 16, ESLint 9, Storybook 10.6, Playwright 1.63
and `@axe-core/playwright` 4.13. I stayed on TypeScript 6 because typescript-eslint doesn't support
7 yet.

```
src/                             the library: no React, no DOM; tests sit next to each file
  index.ts                       evaluateLogFile and evaluateLogStream
  LogParser.ts                   reads the log line by line with push(chunk) and finish()
  types.ts                       SensorType, Classification and the rule interfaces
  sensors/sensorRules.ts         the rule for each sensor type and the reference-line column order
  sensors/thermometer.ts         the thermometer rule
  sensors/everyReadingWithin.ts  the keep/discard rule humidity and CO share
  sensors/comparisons.ts         isWithin and isBelow with a 1e-9 float tolerance
  sensors/RunningStats.ts        one-pass mean and population standard deviation (Welford)
demo/                            Vite + React page that uses the library
  components/LogFileInput/       file input and "Use sample log" button, with its test and stories
  components/ResultsTable/       results table, with its test and stories
  hooks/                         useLogEvaluation and its test
  App.tsx, main.tsx              the page and its entry point, with index.html, styles.css, public/
e2e/                             Playwright test for the demo
```

## Approach

### No DOM in the library

Nothing in `src/` imports React or touches the browser, so the same code can run in Node, in a
browser or inside a backend service. Its tests run in Jest's Node environment, and `build:lib`
compiles against the plain ES2023 library, so using `document` or `window` would fail the build.

### Streaming

`LogParser` takes the log in chunks (`push(chunk)`, then `finish()`) and only keeps the unfinished
last line between chunks. Each sensor keeps a fixed amount of state: a running mean and population
standard deviation for thermometers (Welford's algorithm, one pass), and a single keep/discard flag
for humidity and CO sensors. Memory grows with the number of sensors, not the number of readings.

`evaluateLogFile(string)` is the function from the brief. `evaluateLogStream` feeds the same parser
from a `ReadableStream<string>`, which is how the demo reads a file with `file.stream()`. It uses
`getReader()` rather than async iteration so it works in Node and every current browser.

### Adding a sensor type

A sensor that is kept or discarded on a tolerance is one line in `src/sensors/sensorRules.ts`. For a
noise detector:

1. Add `'noise'` to `SensorType` in `src/types.ts`.
2. Add `noise: everyReadingWithin(5)` to `sensorRules`. The object `satisfies
   Record<SensorType, SensorRule>`, so TypeScript won't compile until the rule exists.
3. Add `'noise'` to `REFERENCE_COLUMNS` at the position it takes on the reference line. A test fails
   if any sensor type is missing from the columns.

```ts
export const sensorRules = {
  thermometer,
  humidity: everyReadingWithin(1),
  monoxide: everyReadingWithin(3),
  noise: everyReadingWithin(5),
} satisfies Record<SensorType, SensorRule>;

export const REFERENCE_COLUMNS: readonly SensorType[] = [
  'thermometer',
  'humidity',
  'monoxide',
  'noise',
];
```

The reference line becomes `reference 70.0 45.0 6 40`, and the error messages pick up the new type.

A sensor with its own logic gets its own file in `src/sensors/`, like `thermometer.ts`. It exports a
`SensorRule` whose `createAccumulator(reference)` returns `addReading` and `classify`, and
`sensorRules.ts` imports it in place of the one-liner.

### The demo

The brief asks for a library, so I kept the page small. It shows the library working and how I'd
build the UI around it: a labelled native file input, a real table with a caption and header cells,
a polite status region, and an alert that names the file and the line that failed. It reads the file
as a stream and parses each chunk as it arrives, so there is no worker and no server. I used Vite
rather than Next.js because it's a single client-side page.

`LogFileInput` only reports what the user did. `useLogEvaluation` does the work: `evaluate(file)`
and `evaluateSample()`, which fetches `sample.log`, both go through one `run`. A run is aborted when
a newer one starts or the page unmounts, and an aborted run never updates the state.

All the styling is in `demo/styles.css`. Colours, radii and shadows are custom properties on
`:root`, and the components only set class names and data attributes. The file input is the
browser's own control, styled so its button is the primary action, with the sample log as a quieter
secondary button below it. Each classification is a pill that always shows the word, so colour is
only a supplement. All text meets 4.5:1 contrast (the lowest pair is 5.87:1), keyboard focus shows a
2px ring, the loading spinner stops when reduced motion is requested, and the layout works down to
320px wide.

### Tests

- `src/**/*.test.ts`: every rule boundary, including floating-point cases such as `64.4 - 63.9`;
  `RunningStats` against a naive two-pass calculation; each parse error and its line number; and the
  sample log split at every possible point, with LF and CRLF line endings.
- `demo/**/*.test.ts(x)`: Testing Library, querying by role and label only. The App tests run the
  real hook and library. The hook tests cover the sample log (including a 404), stale runs and
  unmounting. jsdom has no web streams, so `jest.setup.ts` swaps in Node's `Blob`, `File` and
  `TextDecoderStream`.
- Storybook stories for the table and the file input, rendered with the demo's stylesheet and
  checked with the accessibility addon.
- `e2e/evaluateLog.spec.ts`: uploads the sample and a broken log, runs axe on both states, and
  completes the flow using only the keyboard.

## Assumptions

- "Within" is inclusive: a mean exactly 0.5 from the reference passes, as does a reading exactly 1
  (humidity) or 3 ppm (CO) away.
- "Less than 3" and "under 5" are strict: a standard deviation of exactly 3 is "very precise", and
  exactly 5 is "precise".
- Standard deviation is the population standard deviation (divide by n), because the log holds every
  reading for that unit, not a sample of them.
- Comparisons allow 1e-9 of floating-point error, so `64.4 - 63.9 = 0.5000000000000071` counts as
  0.5.
- Bad data fails with the line number rather than being skipped or guessed at: a missing or short
  reference line, an unknown sensor type, a reading before any sensor, a non-numeric or out-of-range
  value, a repeated sensor name, a sensor with no readings, a blank line in the middle, or a line
  with the wrong number of fields. Trailing blank lines are fine.
- Real log lines are short, so a line over 1000 characters is treated as bad data. It's rejected as
  soon as it passes the limit, so a file with no newlines can't fill memory.
- Timestamps must look like ISO 8601 but aren't used otherwise. None of the rules depend on time
  order.
- CO readings don't have to be integers. A decimal reading is classified the same way.
- A sensor name is any text without spaces, including names such as `__proto__` or `constructor`.
  Each one becomes an own property of the result.
- Sensors are listed in the order they first appear in the log.

## What I'd change next

- Named reference values, such as `reference thermometer=70.0 humidity=45.0 monoxide=6`. At the
   moment, the column order is the contract, so adding a noise detector means every log needs a fourth
  value, even for rooms with no noise sensors. With names, new types are additive and old logs stay
  valid.
- Self-contained reading lines: either put the sensor name on every reading
  (`2007-04-05T22:00 temp-1 72.4`) or move to JSON Lines. Today a reading only makes sense after
  everything above it has been read, so a large log can't be split and processed in parallel.
- Units in the header (°F, %RH, ppm), so a Celsius thermometer can't be compared with a Fahrenheit
  reference without anyone noticing.
- A Web Worker in the demo, if profiling a production-sized log shows long tasks on the main thread.
  A `File` can be posted to a worker, and the worker would call `evaluateLogStream` the same way the
  hook does now.
- A GraphQL service in front of the library if results need to be shared between tools or teams.
  The rules would live in one place, results could be stored, and the library would run in Node
  unchanged.
