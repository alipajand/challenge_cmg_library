export type SensorType = 'thermometer' | 'humidity' | 'monoxide';

export type Classification = 'ultra precise' | 'very precise' | 'precise' | 'keep' | 'discard';

export interface SensorAccumulator {
  addReading(value: number): void;
  classify(): Classification;
}

export interface SensorRule {
  createAccumulator(reference: number): SensorAccumulator;
}
