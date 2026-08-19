export function charsOf(text: string): string[] {
  return Array.from(text);
}

export function visibleCharCount(params: {
  length: number;
  committedCount: number;
  segmentStartedAt: number;
  now: number;
  charsPerSecond: number;
}): number {
  const elapsed = Math.max(0, params.now - params.segmentStartedAt);
  const added = Math.floor((elapsed * params.charsPerSecond) / 1000);
  return Math.min(params.length, params.committedCount + added);
}

export function visibleText(body: string, count: number): string {
  return charsOf(body).slice(0, count).join("");
}
