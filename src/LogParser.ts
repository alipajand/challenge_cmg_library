import { REFERENCE_COLUMNS, sensorRules } from './sensors/sensorRules.ts';
import type { Classification, SensorAccumulator, SensorType } from './types.ts';

const REFERENCE_LINE = `reference ${REFERENCE_COLUMNS.map((type) => `<${type}>`).join(' ')}`;
const MAX_LINE_LENGTH = 1000;
const LINE_TOO_LONG = `The line is longer than ${MAX_LINE_LENGTH} characters.`;
const NUMBER = /^[+-]?\d+(\.\d+)?$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

interface Sensor {
  name: string;
  line: number;
  accumulator: SensorAccumulator;
  hasReadings: boolean;
}

function isSensorType(type: string): type is SensorType {
  return Object.hasOwn(sensorRules, type);
}

export class LogParser {
  private unfinishedLine = '';
  private lineNumber = 0;
  private firstBlankLine: number | undefined;
  private references: Record<SensorType, number> | undefined;
  private currentSensor: Sensor | undefined;
  private readonly sensors = new Map<string, Sensor>();

  push(chunk: string): void {
    const lines = (this.unfinishedLine + chunk).split('\n');
    this.unfinishedLine = lines.pop() ?? '';
    for (const line of lines) {
      this.parseLine(line);
    }
    if (this.unfinishedLine.length > MAX_LINE_LENGTH) {
      throw this.error(LINE_TOO_LONG, this.lineNumber + 1);
    }
  }

  finish(): Record<string, Classification> {
    if (this.unfinishedLine !== '') {
      this.parseLine(this.unfinishedLine);
      this.unfinishedLine = '';
    }
    if (!this.references) {
      throw this.error(`The log is empty. Expected "${REFERENCE_LINE}".`, 1);
    }
    this.ensureCurrentSensorHasReadings();
    return Object.fromEntries(
      Array.from(this.sensors, ([name, sensor]) => [name, sensor.accumulator.classify()]),
    );
  }

  private parseLine(line: string): void {
    this.lineNumber += 1;
    if (line.length > MAX_LINE_LENGTH) {
      throw this.error(LINE_TOO_LONG);
    }

    const text = line.trim();
    if (text === '') {
      this.firstBlankLine ??= this.lineNumber;
      return;
    }
    if (this.firstBlankLine !== undefined) {
      const message = 'Blank lines are only allowed at the end of the log.';
      throw this.error(message, this.firstBlankLine);
    }

    const fields = text.split(/\s+/);
    if (!this.references) {
      this.references = this.parseReferenceLine(fields);
      return;
    }
    if (fields.length !== 2) {
      throw this.error('Expected a sensor "<type> <name>" or a reading "<timestamp> <value>".');
    }

    const [first, second] = fields;
    if (/^\d/.test(first)) {
      this.addReading(first, second);
    } else {
      this.startSensor(first, second, this.references);
    }
  }

  private parseReferenceLine([keyword, ...values]: string[]): Record<SensorType, number> {
    if (keyword !== 'reference' || values.length !== REFERENCE_COLUMNS.length) {
      throw this.error(`Expected the reference line "${REFERENCE_LINE}".`);
    }
    return Object.fromEntries(
      REFERENCE_COLUMNS.map((type, column) => [type, this.parseNumber(values[column])]),
    ) as Record<SensorType, number>;
  }

  private startSensor(type: string, name: string, references: Record<SensorType, number>): void {
    this.ensureCurrentSensorHasReadings();
    if (!isSensorType(type)) {
      const knownTypes = Object.keys(sensorRules).join(', ');
      throw this.error(`Unknown sensor type "${type}". Expected one of: ${knownTypes}.`);
    }

    const existing = this.sensors.get(name);
    if (existing) {
      throw this.error(`Sensor "${name}" was already declared on line ${existing.line}.`);
    }

    this.currentSensor = {
      name,
      line: this.lineNumber,
      accumulator: sensorRules[type].createAccumulator(references[type]),
      hasReadings: false,
    };
    this.sensors.set(name, this.currentSensor);
  }

  private addReading(timestamp: string, value: string): void {
    if (!this.currentSensor) {
      throw this.error('Found a reading before any sensor was declared.');
    }
    if (!TIMESTAMP.test(timestamp)) {
      throw this.error(`"${timestamp}" is not an ISO 8601 timestamp.`);
    }
    this.currentSensor.accumulator.addReading(this.parseNumber(value));
    this.currentSensor.hasReadings = true;
  }

  private ensureCurrentSensorHasReadings(): void {
    const sensor = this.currentSensor;
    if (sensor && !sensor.hasReadings) {
      throw this.error(`Sensor "${sensor.name}" has no readings.`, sensor.line);
    }
  }

  private parseNumber(value: string): number {
    if (!NUMBER.test(value)) {
      throw this.error(`"${value}" is not a number.`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw this.error(`"${value}" is out of range.`);
    }
    return number;
  }

  private error(message: string, line = this.lineNumber): Error {
    return new Error(`Line ${line}: ${message}`);
  }
}
