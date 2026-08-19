import { describe, expect, it } from "vitest";
import { FakeClock, createOffsetSyncedClock } from "./clock.ts";
import { offsetFromProbe, offsetFromProbes } from "./time-sync.ts";

describe("synced clock", () => {
  it("adds offset so two local origins become comparable", () => {
    const host = new FakeClock(1000, 0);
    const clientLocal = new FakeClock(40_000, 0);
    const offset = host.syncedNow() - clientLocal.now();
    const client = createOffsetSyncedClock(clientLocal, offset);
    expect(client.syncedNow()).toBe(host.syncedNow());
    clientLocal.advance(15);
    host.advance(15);
    expect(client.syncedNow()).toBe(host.syncedNow());
  });
});

describe("NTP-style offset", () => {
  it("recovers a constant offset and prefers the lowest RTT sample", () => {
    const offset = 250;
    const probeFast = {
      t0Local: 0,
      t1Remote: offset + 5,
      t2Remote: offset + 5,
      t3Local: 10,
    };
    const probeSlow = {
      t0Local: 0,
      t1Remote: offset + 40,
      t2Remote: offset + 40,
      t3Local: 80,
    };
    expect(offsetFromProbe(probeFast).offsetMs).toBe(offset);
    expect(offsetFromProbes([probeSlow, probeFast])).toBe(offset);
  });
});
