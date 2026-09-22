import { LogParser } from './LogParser.ts';

function parse(log: string) {
  const parser = new LogParser();
  parser.push(log);
  return parser.finish();
}

function lines(...content: string[]) {
  return content.join('\n');
}

const REFERENCE = 'reference 70.0 45.0 6';
const EXPECTED_REFERENCE = 'reference <thermometer> <humidity> <monoxide>';

test('lists sensors in the order they first appear', () => {
  const log = lines(
    REFERENCE,
    'monoxide mon-1',
    '2007-04-05T22:04 6',
    'thermometer temp-1',
    '2007-04-05T22:00 70.1',
    'humidity hum-1',
    '2007-04-05T22:04 45.2',
  );

  expect(Object.keys(parse(log))).toEqual(['mon-1', 'temp-1', 'hum-1']);
});

test('accepts CRLF line endings', () => {
  const log = `${REFERENCE}\r\nhumidity hum-1\r\n2007-04-05T22:04 45.2\r\n`;

  expect(parse(log)).toEqual({ 'hum-1': 'keep' });
});

test('accepts trailing blank lines', () => {
  const log = lines(REFERENCE, 'humidity hum-1', '2007-04-05T22:04 45.2', '', '  ', '');

  expect(parse(log)).toEqual({ 'hum-1': 'keep' });
});

test('accepts a log without a trailing newline', () => {
  expect(parse(lines(REFERENCE, 'monoxide mon-1', '2007-04-05T22:04 9'))).toEqual({
    'mon-1': 'keep',
  });
});

test('returns no sensors for a log with only the reference line', () => {
  expect(parse(`${REFERENCE}\n`)).toEqual({});
});

test('accepts a byte order mark before the reference line', () => {
  expect(parse(lines(`\uFEFF${REFERENCE}`, 'monoxide mon-1', '2007-04-05T22:04 9'))).toEqual({
    'mon-1': 'keep',
  });
});

test('accepts a line of exactly 1000 characters', () => {
  const name = 'x'.repeat(1000 - 'thermometer '.length);

  expect(parse(lines(REFERENCE, `thermometer ${name}`, '2007-04-05T22:00 70.1'))).toEqual({
    [name]: 'ultra precise',
  });
});

test('reports the right line when the last line is bad and has no newline', () => {
  expect(() => parse(lines(REFERENCE, 'thermometer temp-1', '2007-04-05T22:00 hot'))).toThrow(
    new Error('Line 3: "hot" is not a number.'),
  );
});

test('keeps sensor names like __proto__ and constructor as own properties', () => {
  const results = parse(
    lines(
      REFERENCE,
      'humidity __proto__',
      '2007-04-05T22:04 45.2',
      'monoxide constructor',
      '2007-04-05T22:04 6',
    ),
  );

  expect(Object.getPrototypeOf(results)).toBe(Object.prototype);
  expect(Object.hasOwn(results, '__proto__')).toBe(true);
  expect(Object.hasOwn(results, 'constructor')).toBe(true);
  expect(Object.entries(results)).toEqual([
    ['__proto__', 'keep'],
    ['constructor', 'keep'],
  ]);
});

test('joins lines that arrive in separate chunks', () => {
  const parser = new LogParser();
  parser.push('reference 70.0 45.0 6\r');
  parser.push('\nthermo');
  parser.push('meter temp-1\n2007-04-05T22:00 7');
  parser.push('0.2');

  expect(parser.finish()).toEqual({ 'temp-1': 'ultra precise' });
});

test.each([
  ['the log is empty', '', `Line 1: The log is empty. Expected "${EXPECTED_REFERENCE}".`],
  [
    'the log only has blank lines',
    '\n  \n\r\n',
    `Line 1: The log is empty. Expected "${EXPECTED_REFERENCE}".`,
  ],
  [
    'the first line is not a reference line',
    lines('thermometer temp-1', '2007-04-05T22:00 70.1'),
    `Line 1: Expected the reference line "${EXPECTED_REFERENCE}".`,
  ],
  [
    'the reference line is missing a value',
    lines('reference 70.0 45.0', 'thermometer temp-1', '2007-04-05T22:00 70.1'),
    `Line 1: Expected the reference line "${EXPECTED_REFERENCE}".`,
  ],
  [
    'a reference value is not a number',
    lines('reference 70.0 humid 6'),
    'Line 1: "humid" is not a number.',
  ],
  [
    'a reference value is too large to represent',
    lines(`reference 1${'0'.repeat(400)} 45.0 6`),
    `Line 1: "1${'0'.repeat(400)}" is out of range.`,
  ],
  [
    'a blank line comes before the reference line',
    lines('', REFERENCE),
    'Line 1: Blank lines are only allowed at the end of the log.',
  ],
  [
    'the sensor type is unknown',
    lines(REFERENCE, 'noise noise-1', '2007-04-05T22:00 40'),
    'Line 2: Unknown sensor type "noise". Expected one of: thermometer, humidity, monoxide.',
  ],
  [
    'a reading comes before any sensor',
    lines(REFERENCE, '2007-04-05T22:00 70.1'),
    'Line 2: Found a reading before any sensor was declared.',
  ],
  [
    'a reading is not a number',
    lines(REFERENCE, 'thermometer temp-1', '2007-04-05T22:00 hot'),
    'Line 3: "hot" is not a number.',
  ],
  [
    'a reading is too large to represent',
    lines(REFERENCE, 'thermometer temp-1', `2007-04-05T22:00 ${'9'.repeat(400)}`),
    `Line 3: "${'9'.repeat(400)}" is out of range.`,
  ],
  [
    'a timestamp is not ISO 8601',
    lines(REFERENCE, 'thermometer temp-1', '22:00 70.1'),
    'Line 3: "22:00" is not an ISO 8601 timestamp.',
  ],
  [
    'a sensor name is declared twice',
    lines(
      REFERENCE,
      'humidity hum-1',
      '2007-04-05T22:04 45.2',
      'humidity hum-1',
      '2007-04-05T22:05 45.3',
    ),
    'Line 4: Sensor "hum-1" was already declared on line 2.',
  ],
  [
    'a sensor has no readings',
    lines(REFERENCE, 'thermometer temp-1', 'humidity hum-1', '2007-04-05T22:04 45.2'),
    'Line 2: Sensor "temp-1" has no readings.',
  ],
  [
    'the last sensor has no readings',
    lines(REFERENCE, 'humidity hum-1', '2007-04-05T22:04 45.2', 'thermometer temp-1', ''),
    'Line 4: Sensor "temp-1" has no readings.',
  ],
  [
    'a blank line is in the middle of the log',
    lines(REFERENCE, 'humidity hum-1', '', '2007-04-05T22:04 45.2'),
    'Line 3: Blank lines are only allowed at the end of the log.',
  ],
  [
    'a line has too many fields',
    lines(REFERENCE, 'thermometer temp 1', '2007-04-05T22:00 70.1'),
    'Line 2: Expected a sensor "<type> <name>" or a reading "<timestamp> <value>".',
  ],
  [
    'a line is longer than 1000 characters',
    lines(REFERENCE, `thermometer ${'x'.repeat(989)}`, '2007-04-05T22:00 70.1'),
    'Line 2: The line is longer than 1000 characters.',
  ],
  [
    'a line has a single field',
    lines(REFERENCE, 'thermometer', '2007-04-05T22:00 70.1'),
    'Line 2: Expected a sensor "<type> <name>" or a reading "<timestamp> <value>".',
  ],
])('throws when %s', (_, log, message) => {
  expect(() => parse(log)).toThrow(new Error(message));
});
