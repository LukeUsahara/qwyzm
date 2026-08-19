import { describe, expect, it } from "vitest";
import type { Genre } from "@qwyzm/shared";
import { filterQuestionsByGenres } from "./selector.ts";
import type { Question } from "./types.ts";

const genres: Genre[] = [
  {
    id: "history",
    parentId: null,
    slug: "history",
    name: "歴史",
    sortOrder: 0,
    kind: "main",
  },
  {
    id: "japan",
    parentId: "history",
    slug: "japan",
    name: "日本史",
    sortOrder: 1,
    kind: "main",
  },
  {
    id: "science",
    parentId: null,
    slug: "science",
    name: "科学",
    sortOrder: 2,
    kind: "main",
  },
  {
    id: "trivia",
    parentId: null,
    slug: "trivia",
    name: "雑学",
    sortOrder: 3,
    kind: "unique",
  },
];

function q(id: string, genreIds: string[]): Question {
  return {
    id,
    body: id,
    answers: [{ displayText: "あ", normalizedText: "あ" }],
    closeAnswers: [],
    genreIds,
  };
}

describe("filterQuestionsByGenres", () => {
  const pool = [
    q("a", ["japan"]),
    q("b", ["science"]),
    q("c", ["japan", "science"]),
    q("d", ["trivia"]),
  ];

  it("returns every main-tagged question when 全て is on", () => {
    expect(
      filterQuestionsByGenres(pool, genres, {
        allMain: true,
        selectedGenreIds: [],
        includeUnique: false,
        selectedUniqueGenreIds: [],
      }).map((item) => item.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("includes child leaves when a parent is selected", () => {
    const filtered = filterQuestionsByGenres(pool, genres, {
      allMain: false,
      selectedGenreIds: ["history"],
      includeUnique: false,
      selectedUniqueGenreIds: [],
    });
    expect(filtered.map((item) => item.id).sort()).toEqual(["a", "c"]);
  });

  it("unions multiple selected genres", () => {
    const filtered = filterQuestionsByGenres(pool, genres, {
      allMain: false,
      selectedGenreIds: ["japan", "science"],
      includeUnique: false,
      selectedUniqueGenreIds: [],
    });
    expect(filtered.map((item) => item.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("adds unique-tagged questions when unique is included", () => {
    const filtered = filterQuestionsByGenres(pool, genres, {
      allMain: false,
      selectedGenreIds: ["science"],
      includeUnique: true,
      selectedUniqueGenreIds: [],
    });
    expect(filtered.map((item) => item.id).sort()).toEqual(["b", "c", "d"]);
  });
});
