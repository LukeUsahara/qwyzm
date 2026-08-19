import { describe, expect, it } from "vitest";
import { answerInputSchema, catalogQuestionWriteSchema, handleSchema } from "./index.ts";

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
