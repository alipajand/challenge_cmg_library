import type { SensorRule } from '../types.ts';
import { isWithin } from './comparisons.ts';

export function everyReadingWithin(limit: number): SensorRule {
  return {
    createAccumulator(reference) {
      let keep = true;
      return {
        addReading(value) {
          keep &&= isWithin(value, reference, limit);
        },
        classify: () => (keep ? 'keep' : 'discard'),
      };
    },
  };
}
