export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Shortest signed angular difference `to - from`, in the range (-180, 180]. */
export function signedDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
