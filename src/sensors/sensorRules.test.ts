import { REFERENCE_COLUMNS, sensorRules } from './sensorRules.ts';
import type { SensorType } from '../types.ts';

function classify(type: SensorType, reference: number, readings: number[]) {
  const accumulator = sensorRules[type].createAccumulator(reference);
  readings.forEach((reading) => accumulator.addReading(reading));
  return accumulator.classify();
}

describe('thermometer', () => {
  test.each([
    ['ultra precise', 'the mean is exactly 0.5 above the reference', 70, [70.5, 70.5]],
    ['ultra precise', 'the mean is exactly 0.5 below the reference', 70, [69.5, 69.5]],
    ['precise', 'the mean is 0.5 + ε above the reference', 70, [70.501, 70.501]],
    ['precise', 'the mean is 0.5 + ε below the reference', 70, [69.499, 69.499]],
    ['ultra precise', 'the std dev is just under 3', 70, [67.01, 72.99]],
    ['very precise', 'the std dev is exactly 3', 70, [67, 73]],
    ['very precise', 'the std dev is between 3 and 5', 70, [66, 74]],
    ['very precise', 'the std dev is just under 5', 70, [65.01, 74.99]],
    ['precise', 'the std dev is exactly 5', 70, [65, 75]],
    ['ultra precise', 'float error puts the mean at 0.5000000000000071', 63.9, [64.4]],
    ['very precise', 'float error puts the std dev at 2.9999999999999996', 1.1, [-1.9, 4.1]],
  ])('is %s when %s', (expected, _, reference, readings) => {
    expect(classify('thermometer', reference, readings)).toBe(expected);
  });
});

describe('humidity', () => {
  test.each([
    ['keep', 'every reading is within 1', 45, [45.2, 44.1, 45.9]],
    ['keep', 'readings are exactly 1 away', 45, [44, 46]],
    ['discard', 'one reading is 1 + ε above', 45, [45, 46.001, 45]],
    ['discard', 'one reading is 1 + ε below', 45, [45, 43.999, 45]],
    ['keep', 'float error puts a reading at 1.0000000000000036 away', 31.2, [32.2]],
  ])('is %s when %s', (expected, _, reference, readings) => {
    expect(classify('humidity', reference, readings)).toBe(expected);
  });
});

describe('monoxide', () => {
  test.each([
    ['keep', 'every reading is within 3', 6, [5, 7, 9]],
    ['keep', 'readings are exactly 3 away', 6, [3, 9]],
    ['discard', 'one reading is 4 above', 6, [6, 10, 6]],
    ['discard', 'one reading is 4 below', 6, [6, 2, 6]],
  ])('is %s when %s', (expected, _, reference, readings) => {
    expect(classify('monoxide', reference, readings)).toBe(expected);
  });
});

test('REFERENCE_COLUMNS lists every sensor type exactly once', () => {
  expect([...REFERENCE_COLUMNS].sort()).toEqual(Object.keys(sensorRules).sort());
});
