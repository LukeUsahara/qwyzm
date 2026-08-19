import { describe, expect, it } from "vitest";
import { isAllowedInput } from "@qwyzm/game-core";
import { descendantLeafIds, mainGenres, uniqueGenres } from "@qwyzm/shared";
import { FIXTURE_QUESTIONS } from "./fixtures/questions.ts";
import { GENRE, GENRES } from "./fixtures/genres.ts";
import { filterCatalogByGenres } from "./question-repository.ts";

describe("official catalog fixtures", () => {
  it("has official questions with unique ids and bodies", () => {
    expect(FIXTURE_QUESTIONS.length).toBeGreaterThanOrEqual(100);
    const ids = FIXTURE_QUESTIONS.map((question) => question.id);
    const bodies = FIXTURE_QUESTIONS.map((question) => question.body);
    expect(new Set(ids).size).toBe(FIXTURE_QUESTIONS.length);
    expect(new Set(bodies).size).toBe(FIXTURE_QUESTIONS.length);
    expect(FIXTURE_QUESTIONS.every((question) => (question.status ?? "official") === "official")).toBe(
      true,
    );
  });

  it("uses only allowed input text", () => {
    const inputs = FIXTURE_QUESTIONS.flatMap((question) => [
      question.primary.inputText,
      ...question.primary.silentInputs,
      ...question.alternates.flatMap((alternate) => [
        alternate.inputText,
        ...alternate.silentInputs,
      ]),
      ...question.closeInputs,
    ]);
    const invalid = inputs.filter((input) => !isAllowedInput(input) || input.trim().length === 0);
    expect(invalid).toEqual([]);
  });

  it("keeps the three questions tests pin by id", () => {
    const fuji = FIXTURE_QUESTIONS.find((question) => question.id.endsWith("000000000001"));
    const pearl = FIXTURE_QUESTIONS.find((question) => question.id.endsWith("000000000002"));
    const genji = FIXTURE_QUESTIONS.find((question) => question.id.endsWith("000000000006"));
    expect(fuji?.closeInputs).toEqual(["ふじのやま"]);
    expect(pearl?.body).toContain("豚に何");
    expect(pearl?.primary.silentInputs).toEqual(["しんじゅ"]);
    expect(genji?.primary.inputText).toBe("むらさきしきぶ");
  });

  it("covers every top-level main genre", () => {
    const roots = mainGenres(GENRES).filter((genre) => genre.parentId === null);
    for (const root of roots) {
      expect(
        filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, {
          allMain: false,
          selectedGenreIds: descendantLeafIds(GENRES, root.id),
          includeUnique: false,
          selectedUniqueGenreIds: [],
        }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.physics]).length,
    ).toBeGreaterThan(0);
    expect(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.history]).length,
    ).toBeGreaterThan(20);
  });

  it("tags questions with leaves or unique genres only", () => {
    const allowed = new Set([
      ...mainGenres(GENRES)
        .filter((genre) => !mainGenres(GENRES).some((other) => other.parentId === genre.id))
        .map((genre) => genre.id),
      ...uniqueGenres(GENRES).map((genre) => genre.id),
    ]);
    for (const question of FIXTURE_QUESTIONS) {
      expect(question.genreIds.length).toBeGreaterThan(0);
      expect(question.genreIds.every((id) => allowed.has(id))).toBe(true);
    }
  });
});
