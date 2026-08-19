/**
 * NTP-style clock offset between this device and a remote timeline
 * (host or signaling server).
 *
 * t0: local send
 * t1: remote receive (remote clock)
 * t2: remote send (remote clock)
 * t3: local receive
 *
 * offset such that remote ≈ local + offset
 */
export type SyncProbe = {
  t0Local: number;
  t1Remote: number;
  t2Remote: number;
  t3Local: number;
};

export type OffsetEstimate = {
  offsetMs: number;
  rttMs: number;
};

export function offsetFromProbe(probe: SyncProbe): OffsetEstimate {
  const offsetMs =
    (probe.t1Remote - probe.t0Local + (probe.t2Remote - probe.t3Local)) / 2;
  const rttMs =
    probe.t3Local - probe.t0Local - (probe.t2Remote - probe.t1Remote);
  return { offsetMs, rttMs };
}

/** Prefer the sample with the smallest RTT (standard NTP filter). */
export function combineOffsetEstimates(samples: OffsetEstimate[]): number {
  if (samples.length === 0) {
    throw new Error("combineOffsetEstimates requires at least one sample");
  }
  let best = samples[0];
  if (best === undefined) {
    throw new Error("combineOffsetEstimates requires at least one sample");
  }
  for (const sample of samples) {
    if (sample.rttMs < best.rttMs) {
      best = sample;
    }
  }
  return best.offsetMs;
}

export function offsetFromProbes(probes: SyncProbe[]): number {
  return combineOffsetEstimates(probes.map(offsetFromProbe));
}
