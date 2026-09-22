import type { SensorRule } from '../types.ts';
import { isBelow, isWithin } from './comparisons.ts';
import { RunningStats } from './RunningStats.ts';

export const thermometer: SensorRule = {
  createAccumulator(reference) {
    const stats = new RunningStats();
    return {
      addReading: (value) => stats.add(value),
      classify() {
        if (!isWithin(stats.mean, reference, 0.5)) return 'precise';
        if (isBelow(stats.populationStandardDeviation, 3)) return 'ultra precise';
        if (isBelow(stats.populationStandardDeviation, 5)) return 'very precise';
        return 'precise';
      },
    };
  },
};
