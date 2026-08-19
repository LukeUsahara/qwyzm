import { describe, expect, it } from "vitest";
import type { Genre } from "@qwyzm/shared";
import {
  describeAccuracyGrowth,
  describeQuestionBuzz,
  NO_COMPARISON_MESSAGE,
  NO_QUESTION_BUZZ_AVERAGE_MESSAGE,
} from "./growth.ts";
import {
  createJsonPlayRepository,
  createMemoryKeyValueStore,
} from "./json-repository.ts";
import { createMemoryPlayRepository } from "./repository.ts";
import {
  analyzeSession,
  compareGrowth,
  compareQuestionBuzz,
  summarizeAttempts,
  summarizeByGenre,
  summarizeProfile,
} from "./stats.ts";
import { toPlayQuestion, type StoredAttempt, type StoredGame } from "./types.ts";

const HISTORY = "c0a80200-0000-4000-8000-000000000001";
const JAPAN = "c0a80200-0000-4000-8000-000000000011";
const SCIENCE = "c0a80200-0000-4000-8000-000000000002";
const QUESTION_A = "c0a80100-0000-4000-8000-00000000000a";
const QUESTION_B = "c0a80100-0000-4000-8000-00000000000b";

const genres: Genre[] = [
  { id: HISTORY, parentId: null, slug: "history", name: "歴史", sortOrder: 0, kind: "main" },
  { id: JAPAN, parentId: HISTORY, slug: "japan", name: "日本史", sortOrder: 1, kind: "main" },
  { id: SCIENCE, parentId: null, slug: "science", name: "科学", sortOrder: 2, kind: "main" },
];

function attempt(partial: Partial<StoredAttempt> & Pick<StoredAttempt, "id">): StoredAttempt {
  return {
    gameId: "g1",
    questionId: "q1",
    questionIndex: 0,
    questionBody: "本文",
    genreIds: [SCIENCE],
    result: "correct",
    answerRaw: "こたえ",
    answerReveal: "答え",
    buzzTimeMs: 400,
    buzzCharIndex: 4,
    buzzRank: 1,
    answerStartMs: 200,
    answerSubmitMs: 1500,
    closeCount: 0,
    ...partial,
  };
}

function game(id: string, endedAt: string, attempts: StoredAttempt[]): StoredGame {
  return {
    id,
    mode: "solo",
    startedAt: endedAt,
    endedAt,
    selectedGenreIds: [],
    questionCount: attempts.length,
    score: attempts.filter((a) => a.result === "correct").length,
    rank: 1,
    seatIndex: 0,
    attempts: attempts.map((a) => ({ ...a, gameId: id })),
  };
}

describe("PlayRepository save/load", () => {
  it("round-trips games through the JSON store", async () => {
    const store = createMemoryKeyValueStore();
    const repo = createJsonPlayRepository(store);
    const saved = game("game-a", "2026-01-01T00:00:00.000Z", [
      attempt({ id: "a1", result: "correct" }),
    ]);
    await repo.saveGame(saved);
    const loaded = await repo.listGames();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe("game-a");
    expect(loaded[0]?.attempts[0]?.buzzCharIndex).toBe(4);
  });

  it("overwrites the same gameId and returns empty after clear", async () => {
    const repo = createMemoryPlayRepository();
    await repo.saveGame(game("g", "2026-01-01T00:00:00.000Z", [attempt({ id: "1" })]));
    await repo.saveGame(
      game("g", "2026-01-02T00:00:00.000Z", [attempt({ id: "2", result: "incorrect" })]),
    );
    const listed = await repo.listGames();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.attempts[0]?.result).toBe("incorrect");
    await repo.clear();
    expect(await repo.listGames()).toEqual([]);
  });

  it("treats missing or corrupt JSON as empty", async () => {
    const store = createMemoryKeyValueStore({
      "qwyzm.play-data.v1": "{not json",
    });
    const repo = createJsonPlayRepository(store);
    expect(await repo.listGames()).toEqual([]);
  });
});

describe("summarizeAttempts", () => {
  it("returns empty stats when there is no data", () => {
    const stats = summarizeAttempts([]);
    expect(stats.total).toBe(0);
    expect(stats.correctCount).toBe(0);
    expect(stats.incorrectCount).toBe(0);
    expect(stats.accuracy).toBeNull();
    expect(stats.averageAnswerSubmitMs).toBeNull();
  });

  it("computes accuracy and average answer time", () => {
    const stats = summarizeAttempts([
      attempt({ id: "1", result: "correct", answerSubmitMs: 1000 }),
      attempt({ id: "2", result: "incorrect", answerSubmitMs: 2000 }),
      attempt({
        id: "3",
        result: "unanswered",
        buzzCharIndex: null,
        answerSubmitMs: null,
      }),
    ]);
    expect(stats.correctCount).toBe(1);
    expect(stats.incorrectCount).toBe(1);
    expect(stats.unansweredCount).toBe(1);
    expect(stats.accuracy).toBeCloseTo(1 / 3);
    expect(stats.averageAnswerSubmitMs).toBe(1500);
  });
});

describe("summarizeByGenre", () => {
  it("rolls child genres into the parent without mixing buzz positions", () => {
    const stats = summarizeByGenre(
      [
        attempt({
          id: "1",
          genreIds: [JAPAN],
          result: "correct",
          answerSubmitMs: 1000,
        }),
        attempt({
          id: "2",
          genreIds: [SCIENCE],
          result: "incorrect",
          answerSubmitMs: 2000,
        }),
      ],
      genres,
    );
    const history = stats.find((item) => item.genreId === HISTORY);
    const science = stats.find((item) => item.genreId === SCIENCE);
    expect(history?.stats.correctCount).toBe(1);
    expect(history?.stats.incorrectCount).toBe(0);
    expect(history?.stats.accuracy).toBe(1);
    expect(history?.stats.averageAnswerSubmitMs).toBe(1000);
    expect(science?.stats.incorrectCount).toBe(1);
    expect(science?.stats.accuracy).toBe(0);
  });
});

describe("compareGrowth", () => {
  it("returns null metrics when there is no previous data", () => {
    const growth = compareGrowth([attempt({ id: "now" })], []);
    expect(growth.accuracy).toBeNull();
    expect(growth.answerSubmitMs).toBeNull();
    expect(growth).not.toHaveProperty("buzzCharIndex");
    expect(describeAccuracyGrowth(growth.accuracy)).toBe(NO_COMPARISON_MESSAGE);
  });

  it("does not compare a metric when either side lacks samples", () => {
    const previous = [
      game("old", "2026-01-01T00:00:00.000Z", [
        attempt({ id: "p1", buzzCharIndex: null, answerSubmitMs: null }),
      ]),
    ];
    const current = [
      attempt({ id: "c1", buzzCharIndex: 2, answerSubmitMs: 800, result: "correct" }),
    ];
    const growth = compareGrowth(current, previous);
    expect(growth.answerSubmitMs).toBeNull();
    expect(growth.accuracy).not.toBeNull();
  });

  it("compares accuracy and answer time against previous games", () => {
    const previous = [
      game("old", "2026-01-01T00:00:00.000Z", [
        attempt({ id: "p1", answerSubmitMs: 3000, result: "incorrect" }),
        attempt({ id: "p2", answerSubmitMs: 2000, result: "correct" }),
      ]),
    ];
    const current = [
      attempt({ id: "c1", answerSubmitMs: 1000, result: "correct" }),
      attempt({ id: "c2", answerSubmitMs: 1000, result: "correct" }),
    ];
    const growth = compareGrowth(current, previous);
    expect(growth.accuracy?.delta).toBeCloseTo(0.5);
    expect(growth.answerSubmitMs?.delta).toBe(1500);
  });
});

describe("compareQuestionBuzz", () => {
  it("returns no average when the question has no past buzz data", () => {
    const [comparison] = compareQuestionBuzz(
      [attempt({ id: "c1", questionId: QUESTION_A, buzzCharIndex: 8 })],
      [],
    );
    expect(comparison?.previousAverage).toBeNull();
    expect(comparison?.delta).toBeNull();
    expect(describeQuestionBuzz(comparison!)).toBe(NO_QUESTION_BUZZ_AVERAGE_MESSAGE);
  });

  it("ignores past attempts that have no buzz position", () => {
    const [comparison] = compareQuestionBuzz(
      [attempt({ id: "c1", questionId: QUESTION_A, buzzCharIndex: 8 })],
      [
        game("old", "2026-01-01T00:00:00.000Z", [
          attempt({
            id: "p1",
            questionId: QUESTION_A,
            buzzCharIndex: null,
            answerSubmitMs: null,
          }),
        ]),
      ],
    );
    expect(comparison?.previousSampleCount).toBe(0);
    expect(comparison?.previousAverage).toBeNull();
  });

  it("averages only the same questionId and reports an earlier buzz", () => {
    const previous = [
      game("old-1", "2026-01-01T00:00:00.000Z", [
        attempt({ id: "p1", questionId: QUESTION_A, buzzCharIndex: 10 }),
        attempt({ id: "p2", questionId: QUESTION_B, buzzCharIndex: 2 }),
      ]),
      game("old-2", "2026-01-02T00:00:00.000Z", [
        attempt({ id: "p3", questionId: QUESTION_A, buzzCharIndex: 10.8 }),
      ]),
    ];
    const [questionA, questionB] = compareQuestionBuzz(
      [
        attempt({
          id: "c1",
          questionId: QUESTION_A,
          questionIndex: 0,
          buzzCharIndex: 8,
        }),
        attempt({
          id: "c2",
          questionId: QUESTION_B,
          questionIndex: 1,
          buzzCharIndex: 15,
        }),
      ],
      previous,
    );
    expect(questionA?.previousAverage).toBeCloseTo(10.4);
    expect(questionA?.current).toBe(8);
    expect(questionA?.delta).toBeCloseTo(2.4);
    expect(describeQuestionBuzz(questionA!)).toBe("平均より2.4文字早く押せました");
    expect(questionB?.previousAverage).toBe(2);
    expect(questionB?.delta).toBeCloseTo(-13);
    expect(describeQuestionBuzz(questionB!)).toBe("平均より13文字遅く押しました");
  });

  it("reports a later buzz against the same question's average", () => {
    const [comparison] = compareQuestionBuzz(
      [attempt({ id: "c1", questionId: QUESTION_A, buzzCharIndex: 15 })],
      [
        game("old", "2026-01-01T00:00:00.000Z", [
          attempt({ id: "p1", questionId: QUESTION_A, buzzCharIndex: 10 }),
          attempt({ id: "p2", questionId: QUESTION_A, buzzCharIndex: 10.8 }),
        ]),
      ],
    );
    expect(comparison?.previousAverage).toBeCloseTo(10.4);
    expect(comparison?.delta).toBeCloseTo(-4.6);
    expect(describeQuestionBuzz(comparison!)).toBe("平均より4.6文字遅く押しました");
  });

  it("includes custom_room history for the same questionId only", () => {
    const previous = [
      game("solo-old", "2026-01-01T00:00:00.000Z", [
        attempt({ id: "p1", questionId: QUESTION_A, buzzCharIndex: 12 }),
      ]),
      {
        ...game("match-old", "2026-01-02T00:00:00.000Z", [
          attempt({ id: "p2", questionId: QUESTION_A, buzzCharIndex: 8 }),
          attempt({ id: "p3", questionId: QUESTION_B, buzzCharIndex: 1 }),
        ]),
        mode: "custom_room" as const,
      },
    ];
    const [questionA] = compareQuestionBuzz(
      [attempt({ id: "c1", questionId: QUESTION_A, buzzCharIndex: 6 })],
      previous,
    );
    expect(questionA?.previousSampleCount).toBe(2);
    expect(questionA?.previousAverage).toBe(10);
    expect(questionA?.delta).toBe(4);
  });
});

describe("toPlayQuestion", () => {
  it("keeps play fields and drops catalog-only fields", () => {
    const play = toPlayQuestion({
      id: "c0a80100-0000-4000-8000-000000000001",
      body: "日本で一番高い山は？",
      primary: { displayText: "富士山", inputText: "ふじさん", silentInputs: [] },
      alternates: [],
      closeInputs: [],
      genreIds: [SCIENCE],
      status: "official",
      source: { text: "fixture" },
      difficultyRank: null,
    });
    expect(play).toEqual({
      id: "c0a80100-0000-4000-8000-000000000001",
      body: "日本で一番高い山は？",
      answers: [
        { displayText: "富士山", normalizedText: "ふじさん", reveal: "primary" },
      ],
      closeAnswers: [],
      genreIds: [SCIENCE],
    });
  });
});

describe("analyzeSession", () => {
  it("returns empty genre buckets and question buzz when there are no attempts", () => {
    const analysis = analyzeSession({
      currentAttempts: [],
      previousGames: [],
      genres,
    });
    expect(analysis.current.total).toBe(0);
    expect(analysis.byGenre).toEqual([]);
    expect(analysis.byQuestion).toEqual([]);
    expect(analysis.growth.accuracy).toBeNull();
    expect(analysis.growth).not.toHaveProperty("buzzCharIndex");
  });

  it("attaches per-question buzz comparison to the session", () => {
    const analysis = analyzeSession({
      currentAttempts: [
        attempt({ id: "c1", questionId: QUESTION_A, buzzCharIndex: 8 }),
      ],
      previousGames: [
        game("old", "2026-01-01T00:00:00.000Z", [
          attempt({ id: "p1", questionId: QUESTION_A, buzzCharIndex: 10.4 }),
        ]),
      ],
      genres,
    });
    expect(analysis.byQuestion[0]?.delta).toBeCloseTo(2.4);
    expect(analysis.current).not.toHaveProperty("averageBuzzCharIndex");
  });
});

describe("summarizeProfile", () => {
  it("fills every main root genre even without attempts there", () => {
    const profile = summarizeProfile(
      [
        game("g", "2026-01-01T00:00:00.000Z", [
          attempt({ id: "a1", genreIds: [JAPAN], result: "correct" }),
          attempt({ id: "a2", genreIds: [JAPAN], result: "incorrect" }),
        ]),
      ],
      genres,
    );
    expect(profile.overall.accuracy).toBe(0.5);
    expect(profile.byRootGenre.map((item) => item.name)).toEqual(["歴史", "科学"]);
    expect(profile.byRootGenre[0]?.stats.total).toBe(2);
    expect(profile.byRootGenre[1]?.stats.total).toBe(0);
    expect(profile.byRootGenre[1]?.stats.accuracy).toBeNull();
  });
});
