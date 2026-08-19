import { describe, expect, it } from "vitest";
import {
  filterAllowedInput,
  isAllowedInput,
  katakanaToHiragana,
  normalizeForJudge,
} from "./normalize.ts";
import { judgeAnswer } from "./judge.ts";
import type { Question } from "./types.ts";

describe("input charset", () => {
  it("allows hiragana, dakuten, small kana, latin, digits, and long vowel", () => {
    expect(isAllowedInput("ひびぴっゃATP123ー")).toBe(true);
    expect(isAllowedInput("atp")).toBe(true);
  });

  it("rejects katakana and kanji", () => {
    expect(isAllowedInput("ドッジボール")).toBe(false);
    expect(isAllowedInput("富士山")).toBe(false);
    expect(isAllowedInput("しんじゅ。")).toBe(false);
  });

  it("lowercases latin via filter", () => {
    expect(filterAllowedInput("ATP")).toBe("atp");
  });
});

describe("judge", () => {
  const question: Question = {
    id: "q",
    body: "x",
    answers: [
      { displayText: "ATP" },
      { displayText: "ドッジボール", normalizedText: "どっじぼーる" },
    ],
    closeAnswers: [{ displayText: "ドッチボール", normalizedText: "どっちぼーる" }],
    genreIds: [],
  };

  it("treats ATP and atp as the same", () => {
    expect(judgeAnswer("atp", question)).toBe("correct");
    expect(judgeAnswer("ATP", question)).toBe("correct");
  });

  it("matches hiragana input to a katakana display answer", () => {
    expect(judgeAnswer("どっじぼーる", question)).toBe("correct");
    expect(normalizeForJudge("ドッジボール")).toBe("どっじぼーる");
  });

  it("does not treat katakana-to-hiragana as a reason to accept katakana keystrokes", () => {
    expect(isAllowedInput("ドッジボール")).toBe(false);
  });
});

describe("katakanaToHiragana", () => {
  it("converts ヴ to ゔ", () => {
    expect(katakanaToHiragana("ヴェルサイユ")).toBe("ゔぇるさいゆ");
  });
});
