import { RunningStats } from './RunningStats.ts';

function naive(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, populationStandardDeviation: Math.sqrt(variance) };
}

function pseudoRandom(count: number, offset: number, spread: number): number[] {
  let seed = 42;
  return Array.from({ length: count }, () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return offset + (seed / 2 ** 31 - 0.5) * spread;
  });
}

test.each([
  ['a single value', [70]],
  ['identical values', [45, 45, 45, 45]],
  [
    'temp-1 from the sample',
    [72.4, 76, 79.1, 75.6, 71.2, 71.4, 69.2, 65.2, 62.8, 61.4, 64, 67.5, 69.4],
  ],
  ['negative values', [-3, -1, 4, -7, 2]],
  ['10,000 values around 70', pseudoRandom(10_000, 70, 20)],
  ['values around one billion', pseudoRandom(1_000, 1e9, 4)],
])('matches the naive calculation for %s', (_, values) => {
  const stats = new RunningStats();
  values.forEach((value) => stats.add(value));
  const expected = naive(values);

  expect(stats.mean).toBeCloseTo(expected.mean, 6);
  expect(stats.populationStandardDeviation).toBeCloseTo(expected.populationStandardDeviation, 6);
});

test('has no mean or standard deviation before any value is added', () => {
  const stats = new RunningStats();

  expect(stats.mean).toBeNaN();
  expect(stats.populationStandardDeviation).toBeNaN();
});
