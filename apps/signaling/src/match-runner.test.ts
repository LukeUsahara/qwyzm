import { describe, expect, it } from "vitest";
import { FakeClock } from "@qwyzm/game-core";
import { DEFAULT_RULE_SET } from "@qwyzm/shared";
import { createMatchRunner } from "./match-runner.ts";
import type { Question } from "@qwyzm/game-core";

const Q: Question = {
  id: "11111111-1111-4111-8111-111111111111",
  body: "あ",
  answers: [{ displayText: "あ", normalizedText: "あ" }],
  closeAnswers: [],
  genreIds: [],
};

describe("MatchRunner", () => {
  it("completes an unanswered match and ignores extreme client times", () => {
    const clock = new FakeClock(10_000);
    let ended: string | null = null;
    const runner = createMatchRunner({
      matchId: "m1",
      ruleSet: { ...DEFAULT_RULE_SET, questionCount: 1 },
      questions: [Q],
      players: [
        { id: "p1", displayName: "A", seatIndex: 0 },
        { id: "p2", displayName: "B", seatIndex: 1 },
      ],
      clock,
      scheduler: { setTimeout: () => 0, clearTimeout: () => undefined },
      emitState: () => undefined,
      emitConnection: () => undefined,
      onEnd: (payload) => {
        ended = payload.reason;
      },
    });
    runner.start();
    expect(runner.buzz("p1", 0, null)).toBe("buzz_rejected");
    for (let i = 0; i < 40 && ended === null; i += 1) {
      clock.advance(5_000);
      runner.tick();
    }
    expect(ended).toBe("completed");
  });

  it("ends when the last opponent disconnects", () => {
    const clock = new FakeClock(0);
    let ended: string | null = null;
    const runner = createMatchRunner({
      matchId: "m2",
      ruleSet: { ...DEFAULT_RULE_SET, questionCount: 1 },
      questions: [Q],
      players: [
        { id: "p1", displayName: "A", seatIndex: 0 },
        { id: "p2", displayName: "B", seatIndex: 1 },
      ],
      clock,
      scheduler: { setTimeout: () => 0, clearTimeout: () => undefined },
      emitState: () => undefined,
      emitConnection: () => undefined,
      onEnd: (payload) => {
        ended = payload.reason;
      },
    });
    runner.start();
    runner.disconnect("p2");
    expect(ended).toBe("opponents_left");
  });
});
