import { describe, expect, it } from "vitest";
import { formatResultAnswer, judgeAnswer } from "@qwyzm/game-core";
import {
  catalogAnswersFromRows,
  flattenCatalogAnswers,
  namedAnswer,
  toPlayQuestion,
} from "./index.ts";

describe("catalog answer nesting", () => {
  const venice = {
    primary: namedAnswer("ヴェネツィア", "ゔぇねつぃあ", [
      "ゔぇねちあ",
      "べねつぃあ",
      "べねちあ",
    ]),
    alternates: [namedAnswer("Venezia", "venezia")],
    closeInputs: ["べねてぃあ", "ゔぇねてぃあ"],
  };

  it("flattens nested catalog answers for judging", () => {
    expect(flattenCatalogAnswers(venice)).toEqual({
      answers: [
        {
          displayText: "ヴェネツィア",
          normalizedText: "ゔぇねつぃあ",
          reveal: "primary",
        },
        {
          displayText: "ヴェネツィア",
          normalizedText: "ゔぇねちあ",
          reveal: "silent",
        },
        {
          displayText: "ヴェネツィア",
          normalizedText: "べねつぃあ",
          reveal: "silent",
        },
        {
          displayText: "ヴェネツィア",
          normalizedText: "べねちあ",
          reveal: "silent",
        },
        {
          displayText: "Venezia",
          normalizedText: "venezia",
          reveal: "alternate",
        },
      ],
      closeAnswers: [
        { displayText: "べねてぃあ", normalizedText: "べねてぃあ" },
        { displayText: "ゔぇねてぃあ", normalizedText: "ゔぇねてぃあ" },
      ],
    });
  });

  it("rebuilds nesting from ordered rows", () => {
    const nested = catalogAnswersFromRows(
      [
        {
          displayText: "ヴェネツィア",
          normalizedText: "ゔぇねつぃあ",
          reveal: "primary",
          sortOrder: 0,
        },
        {
          displayText: "",
          normalizedText: "ゔぇねちあ",
          reveal: "silent",
          sortOrder: 1,
        },
        {
          displayText: "Venezia",
          normalizedText: "venezia",
          reveal: "alternate",
          sortOrder: 2,
        },
        {
          displayText: "",
          normalizedText: "べねちあ",
          reveal: "silent",
          sortOrder: 3,
        },
      ],
      [{ normalizedText: "べねてぃあ" }],
    );
    expect(nested).toEqual({
      primary: namedAnswer("ヴェネツィア", "ゔぇねつぃあ", ["ゔぇねちあ"]),
      alternates: [namedAnswer("Venezia", "venezia", ["べねちあ"])],
      closeInputs: ["べねてぃあ"],
    });
  });

  it("shows the named answer, not a silent input, on the result screen", () => {
    const question = toPlayQuestion({
      id: "c0a80100-0000-4000-8000-00000000aaaa",
      body: "イタリアの運河の街は？",
      ...venice,
      genreIds: [],
    });
    expect(judgeAnswer("べねちあ", question)).toBe("correct");
    expect(formatResultAnswer(question, "べねちあ")).toBe("ヴェネツィア");
    expect(formatResultAnswer(question, "venezia")).toBe("ヴェネツィア（Venezia）");
    expect(judgeAnswer("べねてぃあ", question)).toBe("close");
  });
});
