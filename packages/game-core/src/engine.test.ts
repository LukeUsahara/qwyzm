import { CHARS_PER_SECOND, MAX_QUESTIONS_PER_GAME, PREVIEW_MS } from "@qwyzm/shared";
import { describe, expect, it } from "vitest";
import { FakeClock } from "./clock.ts";
import { GameEngine } from "./engine.ts";
import { pickQuestions } from "./selector.ts";
import type { GameSettings, PlayerConfig, Question } from "./types.ts";
import { SOLO_DEFAULT_SETTINGS } from "./types.ts";

const PLAYER: PlayerConfig = {
  id: "p1",
  displayName: "練習くん",
  seatIndex: 0,
};

function question(partial: Partial<Question> & Pick<Question, "id" | "body">): Question {
  return {
    answers: [{ displayText: "富士山", normalizedText: "ふじさん" }],
    closeAnswers: [{ displayText: "ふじのやま", normalizedText: "ふじのやま" }],
    genreIds: [],
    ...partial,
  };
}

const Q1 = question({ id: "11111111-1111-4111-8111-111111111111", body: "あいうえお" });
const Q2 = question({
  id: "22222222-2222-4222-8222-222222222222",
  body: "かきくけこ",
    answers: [
      { displayText: "豚に真珠", normalizedText: "ぶたにしんじゅ" },
      { displayText: "真珠", normalizedText: "しんじゅ" },
    ],
  closeAnswers: [],
});

function startSolo(
  clock: FakeClock,
  questions: Question[] = [Q1, Q2],
  settings: Partial<GameSettings> = {},
): GameEngine {
  const engine = new GameEngine(clock);
  engine.start({
    settings: {
      ...SOLO_DEFAULT_SETTINGS,
      questionCount: questions.length,
      ...settings,
    },
    players: [PLAYER],
    questions,
  });
  return engine;
}

function enterReading(engine: GameEngine, clock: FakeClock): void {
  clock.advance(PREVIEW_MS);
  engine.tick();
}

/** `あいうえお` is 5 chars at 10/s → 500ms to full reveal. */
function fullRevealMs(body: string, speed: keyof typeof CHARS_PER_SECOND = "normal"): number {
  return (Array.from(body).length / CHARS_PER_SECOND[speed]) * 1000;
}

describe("preview", () => {
  it("hides text and ignores buzz before 1s", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    clock.advance(999);
    const view = engine.getView();
    expect(view.phase).toBe("preview");
    expect(view.questionTextVisible).toBe(false);
    expect(view.visibleText).toBe("");
    expect(view.canBuzz).toBe(false);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    expect(engine.getView().phase).toBe("preview");
  });

  it("enters reading at 1s", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    clock.advance(PREVIEW_MS);
    expect(engine.getView().phase).toBe("reading");
    expect(engine.getView().canBuzz).toBe(true);
  });
});

describe("character reveal", () => {
  it("reveals from elapsed time, not an interval counter", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    expect(engine.getView().visibleText).toBe("");
    clock.advance(100);
    expect(engine.getView().visibleText).toBe("あ");
    clock.advance(200);
    expect(engine.getView().visibleText).toBe("あいう");
  });

  it("uses speed constants", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1], { revealSpeed: "fast" });
    enterReading(engine, clock);
    clock.advance(1000 / CHARS_PER_SECOND.fast);
    expect(engine.getView().visibleText).toBe("あ");
  });

  it("moves to waitingBuzz when fully revealed", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    clock.advance(fullRevealMs(Q1.body));
    expect(engine.getView().phase).toBe("waitingBuzz");
    expect(engine.getView().visibleText).toBe("あいうえお");
    expect(engine.getView().canBuzz).toBe(true);
  });
});

describe("buzz", () => {
  it("hides the question text immediately", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    clock.advance(300);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    const view = engine.getView();
    expect(view.phase).toBe("answeringWaitInput");
    expect(view.questionTextVisible).toBe(false);
    expect(view.visibleText).toBe("");
    expect(view.canBuzz).toBe(false);
    expect(view.buzzes[0]?.charIndex).toBe(3);
    expect(view.buzzes[0]?.timeFromReadingMs).toBe(300);
  });
});

describe("answer timing", () => {
  it("marks incorrect after 5s with no input, then shows full text and answers", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    clock.advance(5000);
    const view = engine.getView();
    expect(view.phase).toBe("showingResult");
    expect(view.outcome).toBe("incorrect");
    expect(view.questionTextVisible).toBe(true);
    expect(view.visibleText).toBe(Q1.body);
    expect(view.answerReveal).toBe("富士山");
  });

  it("starts a 7s gauge on first input", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふ" });
    const view = engine.getView();
    expect(view.phase).toBe("answering");
    expect(view.gauges[0]?.kind).toBe("answerSubmit");
    expect(view.gauges[0]?.totalMs).toBe(7000);
  });

  it("accepts a correct hiragana answer for a kanji display answer", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじさん" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    const view = engine.getView();
    expect(view.outcome).toBe("correct");
    expect(view.players[0]?.score).toBe(1);
    expect(view.answerReveal).toBe("富士山");
    expect(view.submittedAnswer).toBe("ふじさん");
    expect(view.playRecords).toHaveLength(1);
    expect(view.playRecords[0]?.result).toBe("correct");
    expect(view.playRecords[0]?.buzzCharIndex).toBe(0);
    expect(view.playRecords[0]?.answerRaw).toBe("ふじさん");
  });

  it("accepts any of multiple answers", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q2]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ぶたにしんじゅ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    expect(engine.getView().outcome).toBe("correct");
    expect(engine.getView().answerReveal).toBe("豚に真珠");
  });

  it("retries once on a close answer, then fails on a second close", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじのやま" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    let view = engine.getView();
    expect(view.phase).toBe("answering");
    expect(view.prompt).toBe("言い直してください");
    expect(view.inputValue).toBe("");
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじのやま" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    view = engine.getView();
    expect(view.phase).toBe("showingResult");
    expect(view.outcome).toBe("incorrect");
  });

  it("allows a correct answer after one close retry", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじのやま" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじさん" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    expect(engine.getView().outcome).toBe("correct");
  });

  it("marks incorrect when the 7s submit window elapses", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふ" });
    clock.advance(7000);
    expect(engine.getView().outcome).toBe("incorrect");
  });

  it("strips illegal characters instead of accepting katakana input", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "フジサン" });
    expect(engine.getView().phase).toBe("answeringWaitInput");
    expect(engine.getView().inputValue).toBe("");
  });
});

describe("progress", () => {
  it("shows the correct answer for 3s when nobody buzzes, then advances", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1, Q2]);
    enterReading(engine, clock);
    clock.advance(fullRevealMs(Q1.body));
    clock.advance(5000);
    let view = engine.getView();
    expect(view.phase).toBe("showingResult");
    expect(view.outcome).toBe("unanswered");
    expect(view.answerReveal).toBe("富士山");
    expect(view.questionTextVisible).toBe(true);
    clock.advance(3000);
    view = engine.getView();
    expect(view.phase).toBe("preview");
    expect(view.questionNumber).toBe(2);
  });

  it("always waits 3s on the last question before gameOver", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじさん" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    expect(engine.getView().phase).toBe("showingResult");
    clock.advance(2999);
    expect(engine.getView().phase).toBe("showingResult");
    clock.advance(1);
    expect(engine.getView().phase).toBe("gameOver");
  });

  it("does not lock out the solo player; miss ends the question with full text", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1, Q2]);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "やま" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    const view = engine.getView();
    expect(view.outcome).toBe("incorrect");
    expect(view.lockedPlayerIds).toEqual([]);
    expect(view.visibleText).toBe(Q1.body);
    expect(view.answerReveal).toBe("富士山");
  });
});

describe("score and victory", () => {
  it("starts at 0 and adds correct points", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1], { correctPoints: 2 });
    expect(engine.getView().players[0]?.score).toBe(0);
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじさん" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    expect(engine.getView().players[0]?.score).toBe(2);
  });

  it("applies minus penalty", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1], {
      missPenalty: "minus_points",
      missPoints: 1,
    });
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "やま" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    expect(engine.getView().players[0]?.score).toBe(-1);
  });

  it("ends on first-to-points after the result display", () => {
    const clock = new FakeClock();
    const engine = startSolo(clock, [Q1, Q2], {
      winCondition: "first_to_points",
      targetPoints: 1,
    });
    enterReading(engine, clock);
    engine.dispatch(PLAYER.id, { type: "BUZZ" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_INPUT", value: "ふじさん" });
    engine.dispatch(PLAYER.id, { type: "ANSWER_SUBMIT" });
    clock.advance(3000);
    expect(engine.getView().phase).toBe("gameOver");
  });

  it("allows tied ranks", () => {
    const clock = new FakeClock();
    const engine = new GameEngine(clock);
    engine.start({
      settings: { ...SOLO_DEFAULT_SETTINGS, questionCount: 1 },
      players: [
        PLAYER,
        { id: "p2", displayName: "相手", seatIndex: 1 },
      ],
      questions: [Q1],
    });
    const ranks = engine.getView().players.map((p) => p.rank);
    expect(ranks).toEqual([1, 1]);
  });
});

describe("pickQuestions", () => {
  it("never returns more than MAX_QUESTIONS_PER_GAME", () => {
    const pool = Array.from({ length: 120 }, (_, i) =>
      question({ id: `q-${i}`, body: "あ" }),
    );
    expect(pickQuestions(pool, 999, () => 0.5)).toHaveLength(MAX_QUESTIONS_PER_GAME);
  });
});
