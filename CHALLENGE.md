# The brief

365-Widgets spot-checks cheap home sensors in a room held at a known temperature, humidity and carbon monoxide level. The task is a TypeScript library that exports `evaluateLogFile(logContentsStr)` and classifies every sensor in a log:

- **Thermometer:** "ultra precise" if the mean is within 0.5 of the reference and the standard deviation is under 3, "very precise" if the mean is within 0.5 and the standard deviation is under 5, otherwise "precise".
- **Humidity:** "keep" if every reading is within 1% of the reference, otherwise "discard".
- **Carbon monoxide:** "keep" if every reading is within 3 ppm of the reference, otherwise "discard".

The brief also says production logs will be very large, more sensor types are coming, and the work should be treated as a production pull request.

## Where each requirement is met

| Requirement | Where |
| --- | --- |
| `evaluateLogFile(logContentsStr)` | [src/index.ts](src/index.ts) |
| Classification rules | [src/sensors/](src/sensors) |
| Sample log gives the sample output | [demo/public/sample.log](demo/public/sample.log), checked in [src/index.test.ts](src/index.test.ts) |
| Very large logs | `evaluateLogStream` and [src/LogParser.ts](src/LogParser.ts), see [Streaming](README.md#streaming) |
| New sensor types | [src/sensors/sensorRules.ts](src/sensors/sensorRules.ts), see [Adding a sensor type](README.md#adding-a-sensor-type) |
| Ambiguities in the rules | [Assumptions](README.md#assumptions) |
| Suggested changes to the log format and interface | [What I'd change next](README.md#what-id-change-next) |
| Production quality | Unit, component and end-to-end tests, lint and typecheck, see [Tests](README.md#tests) |
| Setup, dependencies and approach | [README.md](README.md) |
| How AI was used | [How I used AI](README.md#how-i-used-ai) |
