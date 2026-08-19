import { describe, expect, it } from "vitest";
import { clampBuzzTime, medianRtt } from "./time-guard.ts";

describe("clampBuzzTime", () => {
  it("raises a claim before revealedAt and before the previous buzz", () => {
    expect(
      clampBuzzTime({
        claimedAt: 0,
        serverNow: 520,
        rttMs: 40,
        revealedAt: 400,
        lastBuzzAt: 500,
      }),
    ).toBe(501);
  });

  it("clamps a far-future claim to serverNow", () => {
    expect(
      clampBuzzTime({
        claimedAt: 1_000_000,
        serverNow: 800,
        rttMs: null,
        revealedAt: 0,
        lastBuzzAt: null,
      }),
    ).toBe(800);
  });

  it("uses rtt 0 when no samples exist", () => {
    expect(
      clampBuzzTime({
        claimedAt: 700,
        serverNow: 800,
        rttMs: null,
        revealedAt: 0,
        lastBuzzAt: null,
      }),
    ).toBe(720);
    expect(medianRtt([])).toBeNull();
    expect(medianRtt([10, 90, 20])).toBe(20);
  });
});
