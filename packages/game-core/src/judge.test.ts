import { describe, expect, it } from "vitest";
import { formatResultAnswer, judgeAnswer } from "./judge.ts";
import type { Question } from "./types.ts";

const pearl: Question = {
  id: "pearl",
  body: "豚に何？",
  answers: [
    { displayText: "豚に真珠", normalizedText: "ぶたにしんじゅ" },
    { displayText: "真珠", normalizedText: "しんじゅ" },
  ],
  closeAnswers: [],
  genreIds: [],
};

const everest: Question = {
  id: "everest",
  body: "世界で一番高い山は？",
  answers: [
    { displayText: "エベレスト", normalizedText: "えべれすと" },
    {
      displayText: "チョモランマ",
      normalizedText: "ちょもらんま",
      reveal: "alternate",
    },
  ],
  closeAnswers: [],
  genreIds: [],
};

const luther: Question = {
  id: "luther",
  body: "宗教改革の中心人物は？",
  answers: [
    { displayText: "マルティン・ルター", normalizedText: "まるてぃんるたー" },
    { displayText: "ルター", normalizedText: "るたー" },
    { displayText: "マルチン・ルター", normalizedText: "まるちんるたー" },
  ],
  closeAnswers: [],
  genreIds: [],
};

describe("formatResultAnswer", () => {
  it("shows only the primary form for readings and short variants", () => {
    expect(formatResultAnswer(pearl, "しんじゅ")).toBe("豚に真珠");
    expect(formatResultAnswer(pearl, "ぶたにしんじゅ")).toBe("豚に真珠");
    expect(formatResultAnswer(pearl, null)).toBe("豚に真珠");
    expect(formatResultAnswer(luther, "るたー")).toBe("マルティン・ルター");
    expect(formatResultAnswer(luther, "まるちんるたー")).toBe(
      "マルティン・ルター",
    );
  });

  it("appends a distinct alternate only when the player used that name", () => {
    expect(formatResultAnswer(everest, "えべれすと")).toBe("エベレスト");
    expect(formatResultAnswer(everest, "ちょもらんま")).toBe(
      "エベレスト（チョモランマ）",
    );
    expect(formatResultAnswer(everest, null)).toBe("エベレスト");
  });

  it("still judges silent and alternate forms as correct", () => {
    expect(judgeAnswer("しんじゅ", pearl)).toBe("correct");
    expect(judgeAnswer("ちょもらんま", everest)).toBe("correct");
    expect(judgeAnswer("るたー", luther)).toBe("correct");
  });
});
