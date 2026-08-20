import { describe, expect, it } from "vitest";
import {
  answerInputSchema,
  catalogQuestionWriteSchema,
  handleSchema,
  localQuestionSetIdSchema,
  migrateSettings,
  questionSetHttpWriteSchema,
  questionSetWriteSchema,
  roomCodeSchema,
  roomRuleSetSchema,
  clientRoomMessageSchema,
  ruleSetSchema,
  storedGameSchema,
} from "./index.ts";
import { DEFAULT_RULE_SET, DEFAULT_USER_SETTINGS } from "@qwyzm/shared";

describe("answerInputSchema", () => {
  it("accepts hiragana and rejects katakana", () => {
    expect(answerInputSchema.safeParse("ふじさん").success).toBe(true);
    expect(answerInputSchema.safeParse("フジサン").success).toBe(false);
    expect(answerInputSchema.safeParse("どっじぼーる").success).toBe(true);
  });

  it("normalizes and validates handles", () => {
    expect(handleSchema.safeParse("Luke_1").success).toBe(true);
    expect(handleSchema.parse("Luke_1")).toBe("luke_1");
    expect(handleSchema.safeParse("ab").success).toBe(false);
    expect(handleSchema.safeParse("luke-1").success).toBe(false);
  });
});

describe("catalogQuestionWriteSchema", () => {
  const geography = "c0a80200-0000-4000-8000-000000000120";

  it("requires one primary and allows nested silents", () => {
    const parsed = catalogQuestionWriteSchema.parse({
      body: "イタリアの運河の街は？",
      genreIds: [geography],
      primary: {
        displayText: "ヴェネツィア",
        inputText: "ゔぇねつぃあ",
        silentInputs: ["ゔぇねちあ", "べねつぃあ", "べねちあ"],
      },
      alternates: [{ displayText: "Venezia", inputText: "venezia" }],
      closeInputs: ["べねてぃあ", "ゔぇねてぃあ"],
    });
    expect(parsed.primary.silentInputs).toHaveLength(3);
    expect(parsed.alternates).toHaveLength(1);
    expect(parsed.closeInputs).toHaveLength(2);
  });

  it("rejects duplicate inputs and missing primary", () => {
    expect(
      catalogQuestionWriteSchema.safeParse({
        body: "問",
        genreIds: [geography],
        answers: [{ displayText: "旧形" }],
      }).success,
    ).toBe(false);
    expect(
      catalogQuestionWriteSchema.safeParse({
        body: "問",
        genreIds: [geography],
        primary: {
          displayText: "ヴェネツィア",
          inputText: "ゔぇねつぃあ",
          silentInputs: ["ゔぇねつぃあ"],
        },
      }).success,
    ).toBe(false);
  });
});

describe("ruleSetSchema", () => {
  it("accepts the default rule set and rejects unimplemented wrong-answer rules", () => {
    expect(ruleSetSchema.safeParse(DEFAULT_RULE_SET).success).toBe(true);
    expect(
      ruleSetSchema.safeParse({
        ...DEFAULT_RULE_SET,
        wrongAnswerRule: "next_fastest",
      }).success,
    ).toBe(true);
    expect(
      ruleSetSchema.safeParse({
        ...DEFAULT_RULE_SET,
        wrongAnswerRule: "not_a_rule",
      }).success,
    ).toBe(false);
    expect(
      ruleSetSchema.safeParse({
        ...DEFAULT_RULE_SET,
        questionCount: 0,
      }).success,
    ).toBe(false);
  });
});

describe("migrateSettings", () => {
  it("returns defaults for missing or broken JSON", () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
    expect(migrateSettings("nope")).toEqual(DEFAULT_USER_SETTINGS);
    expect(migrateSettings({ version: 99, volume: { master: -1 } })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });

  it("fills gaps from a partial stored document", () => {
    const migrated = migrateSettings({
      ruleSet: { questionCount: 20, revealSpeed: "fast" },
      keyBind: { buzzCode: "KeyJ" },
    });
    expect(migrated.ruleSet.questionCount).toBe(20);
    expect(migrated.ruleSet.revealSpeed).toBe("fast");
    expect(migrated.ruleSet.wrongAnswerRule).toBe("end_question");
    expect(migrated.ruleSet.questionSetId).toBeNull();
    expect(migrated.keyBind.buzzCode).toBe("KeyJ");
    expect(migrated.volume).toEqual(DEFAULT_USER_SETTINGS.volume);
    expect(migrated.showQuestionGenre).toBe(false);
  });
});

describe("questionSetWriteSchema", () => {
  it("accepts local ids and rejects unknown fields on source", () => {
    expect(
      localQuestionSetIdSchema.safeParse("local:c0a80600-0000-4000-8000-000000000001").success,
    ).toBe(true);
    expect(localQuestionSetIdSchema.safeParse("c0a80600-0000-4000-8000-000000000001").success).toBe(
      false,
    );
    expect(
      questionSetWriteSchema.safeParse({
        name: "地理だけ",
        source: "filter",
      }).success,
    ).toBe(true);
    expect(
      questionSetWriteSchema.safeParse({
        name: "x",
        source: "playlist",
      }).success,
    ).toBe(false);
    expect(
      questionSetHttpWriteSchema.safeParse({
        id: "local:c0a80600-0000-4000-8000-000000000001",
        name: "ゲスト",
        source: "filter",
      }).success,
    ).toBe(false);
  });
});

describe("room protocol", () => {
  it("accepts a 6-character room code and room messages", () => {
    expect(roomCodeSchema.safeParse("AAAAAA").success).toBe(true);
    expect(roomCodeSchema.safeParse("aaa").success).toBe(false);
    expect(
      clientRoomMessageSchema.safeParse({
        type: "create",
        displayName: "ホスト",
        ruleSet: DEFAULT_RULE_SET,
      }).success,
    ).toBe(true);
    expect(
      roomRuleSetSchema.safeParse({
        ...DEFAULT_RULE_SET,
        questionSetId: "local:c0a80600-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });
});

describe("storedGameSchema", () => {
  const attempt = {
    id: "c0a80500-0000-4000-8000-000000000001",
    gameId: "c0a80400-0000-4000-8000-000000000001",
    questionId: "c0a80100-0000-4000-8000-000000000001",
    questionIndex: 0,
    questionBody: "本文",
    genreIds: ["c0a80200-0000-4000-8000-000000000002"],
    result: "correct" as const,
    answerRaw: "こたえ",
    answerReveal: "答え",
    buzzTimeMs: 400,
    buzzCharIndex: 4,
    buzzRank: 1,
    answerStartMs: 200,
    answerSubmitMs: 1500,
    closeCount: 0,
  };
  const base = {
    id: "c0a80400-0000-4000-8000-000000000001",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:05:00.000Z",
    selectedGenreIds: [],
    questionCount: 1,
    score: 1,
    attempts: [attempt],
  };

  it("accepts match mode and rejects unknown modes or empty attempts", () => {
    expect(storedGameSchema.safeParse({ ...base, mode: "solo" }).success).toBe(true);
    expect(storedGameSchema.safeParse({ ...base, mode: "match" }).success).toBe(true);
    expect(storedGameSchema.safeParse({ ...base, mode: "custom_room" }).success).toBe(false);
    expect(storedGameSchema.safeParse({ ...base, mode: "versus" }).success).toBe(false);
    expect(storedGameSchema.safeParse({ ...base, mode: "match", attempts: [] }).success).toBe(
      false,
    );
  });
});
