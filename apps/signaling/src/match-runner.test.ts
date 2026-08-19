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

  it("re-emits state on disconnect and resume", () => {
    const clock = new FakeClock(0);
    let states = 0;
    const runner = createMatchRunner({
      matchId: "m3",
      ruleSet: { ...DEFAULT_RULE_SET, questionCount: 1 },
      questions: [Q],
      players: [
        { id: "p1", displayName: "A", seatIndex: 0 },
        { id: "p2", displayName: "B", seatIndex: 1 },
        { id: "p3", displayName: "C", seatIndex: 2 },
      ],
      clock,
      scheduler: { setTimeout: () => 0, clearTimeout: () => undefined },
      emitState: () => {
        states += 1;
      },
      emitConnection: () => undefined,
      onEnd: () => undefined,
    });
    runner.start();
    const afterStart = states;
    runner.disconnect("p2");
    expect(states).toBeGreaterThan(afterStart);
    const afterDisconnect = states;
    runner.resume("p2");
    expect(states).toBeGreaterThan(afterDisconnect);
  });

  it("misses an in-progress answer on disconnect instead of accepting it", () => {
    const clock = new FakeClock(0);
    const queued: { fn: () => void; ms: number }[] = [];
    let lastScore = 0;
    const runner = createMatchRunner({
      matchId: "m4",
      ruleSet: { ...DEFAULT_RULE_SET, questionCount: 1 },
      questions: [Q],
      players: [
        { id: "p1", displayName: "A", seatIndex: 0 },
        { id: "p2", displayName: "B", seatIndex: 1 },
        { id: "p3", displayName: "C", seatIndex: 2 },
      ],
      clock,
      scheduler: {
        setTimeout: (fn, ms) => {
          queued.push({ fn, ms });
          return queued.length;
        },
        clearTimeout: () => undefined,
      },
      emitState: (_id, view) => {
        lastScore = view.players.find((player) => player.id === "p1")?.score ?? 0;
      },
      emitConnection: () => undefined,
      onEnd: () => undefined,
    });
    runner.start();
    clock.advance(1_000);
    runner.tick();
    expect(runner.buzz("p1", clock.syncedNow(), null)).toBeNull();
    expect(runner.intent("p1", { type: "ANSWER_START" }, clock.syncedNow())).toBeNull();
    expect(runner.intent("p1", { type: "ANSWER_INPUT", value: "あ" }, clock.syncedNow())).toBeNull();
    for (const item of [...queued]) {
      if (item.ms === 100) {
        item.fn();
      }
    }
    runner.disconnect("p1");
    expect(lastScore).toBe(0);
  });
});
