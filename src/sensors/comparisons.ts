const FLOAT_TOLERANCE = 1e-9;

export function isWithin(value: number, reference: number, limit: number): boolean {
  return Math.abs(value - reference) <= limit + FLOAT_TOLERANCE;
}

export function isBelow(value: number, limit: number): boolean {
  return value < limit - FLOAT_TOLERANCE;
}
