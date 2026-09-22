import type { SensorRule, SensorType } from '../types.ts';
import { everyReadingWithin } from './everyReadingWithin.ts';
import { thermometer } from './thermometer.ts';

export const sensorRules = {
  thermometer,
  humidity: everyReadingWithin(1),
  monoxide: everyReadingWithin(3),
} satisfies Record<SensorType, SensorRule>;

export const REFERENCE_COLUMNS: readonly SensorType[] = ['thermometer', 'humidity', 'monoxide'];
