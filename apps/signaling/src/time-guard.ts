export type TimeGuardInput = {
  claimedAt: number;
  serverNow: number;
  rttMs: number | null;
  revealedAt: number;
  lastBuzzAt: number | null;
};

export function clampBuzzTime(input: TimeGuardInput): number {
  const rttHalf = input.rttMs === null ? 0 : Math.min(250, Math.max(0, input.rttMs / 2));
  const last = input.lastBuzzAt === null ? Number.NEGATIVE_INFINITY : input.lastBuzzAt + 1;
  const floor = Math.max(input.revealedAt, last, input.serverNow - rttHalf - 80);
  return Math.min(Math.max(input.claimedAt, floor), input.serverNow);
}

export function medianRtt(samples: readonly number[]): number | null {
  if (samples.length === 0) {
    return null;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : sorted[mid - 1];
  return value ?? null;
}
