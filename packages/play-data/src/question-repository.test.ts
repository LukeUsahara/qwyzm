import { describe, expect, it } from "vitest";
import { DEFAULT_GENRE_PLAY_FILTER } from "@qwyzm/shared";
import { GENRE, GENRES } from "./fixtures/genres.ts";
import { FIXTURE_QUESTIONS } from "./fixtures/questions.ts";
import { createMemoryQuestionRepository, filterCatalogByGenres } from "./question-repository.ts";

const PEARL = "c0a80100-0000-4000-8000-000000000002";
const FUJI = "c0a80100-0000-4000-8000-000000000001";
const GENJI = "c0a80100-0000-4000-8000-000000000006";
const MAIN_PLAY_COUNT = filterCatalogByGenres(
  FIXTURE_QUESTIONS,
  GENRES,
  DEFAULT_GENRE_PLAY_FILTER,
).length;

describe("memory QuestionRepository", () => {
  const repo = createMemoryQuestionRepository({
    genres: GENRES,
    questions: FIXTURE_QUESTIONS,
  });

  it("lists all questions when no genre is selected", async () => {
    const questions = await repo.listQuestions();
    expect(questions).toHaveLength(MAIN_PLAY_COUNT);
  });

  it("includes unique-only questions when unique genres are enabled", async () => {
    const questions = await repo.listQuestions({ includeUnique: true });
    expect(questions).toHaveLength(FIXTURE_QUESTIONS.length);
  });

  it("gets a question by id", async () => {
    const question = await repo.getQuestion(PEARL);
    expect(question?.body).toContain("豚に何");
    expect(question?.primary.inputText).toBe("ぶたにしんじゅ");
    expect(question?.primary.silentInputs).toEqual(["しんじゅ"]);
  });

  it("returns null for an unknown id", async () => {
    expect(await repo.getQuestion("c0a80100-0000-4000-8000-00000000ffff")).toBeNull();
  });

  it("filters by a single leaf genre", async () => {
    const questions = await repo.listQuestions({ genreIds: [GENRE.physics] });
    expect(questions.every((question) => question.genreIds.includes(GENRE.physics))).toBe(
      true,
    );
    expect(questions).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.physics]).length,
    );
  });

  it("includes child genres when a parent is selected", async () => {
    const questions = await repo.listQuestions({ genreIds: [GENRE.history] });
    expect(questions.some((question) => question.id === GENJI)).toBe(true);
    expect(questions).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.history]).length,
    );
  });

  it("unions multiple selected genres", async () => {
    const questions = await repo.listQuestions({
      genreIds: [GENRE.history, GENRE.physics],
    });
    expect(questions).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.history, GENRE.physics]).length,
    );
    expect(questions.some((question) => question.id === GENJI)).toBe(true);
  });

  it("keeps silent inputs under the primary answer", async () => {
    const question = await repo.getQuestion(PEARL);
    expect(question?.primary.silentInputs).toEqual(["しんじゅ"]);
  });

  it("keeps close inputs", async () => {
    const question = await repo.getQuestion(FUJI);
    expect(question?.closeInputs).toEqual(["ふじのやま"]);
  });

  it("hides drafts from play lists and can save a new official question", async () => {
    const repo = createMemoryQuestionRepository({
      genres: GENRES,
      questions: [
        ...FIXTURE_QUESTIONS,
        {
          id: "c0a80100-0000-4000-8000-00000000d001",
          body: "下書き",
          primary: { displayText: "こたえ", inputText: "こたえ", silentInputs: [] },
          alternates: [],
          closeInputs: [],
          genreIds: [GENRE.geography],
          status: "draft",
        },
      ],
    });
    expect(await repo.listQuestions()).toHaveLength(MAIN_PLAY_COUNT);
    expect(await repo.listQuestions({ includeUnpublished: true })).toHaveLength(
      MAIN_PLAY_COUNT + 1,
    );

    const saved = await repo.saveQuestion({
      id: "",
      body: "新しい公式問題",
      primary: { displayText: "はい", inputText: "はい", silentInputs: [] },
      alternates: [],
      closeInputs: [],
      genreIds: [GENRE.geography],
      status: "official",
    });
    expect(saved.id.length).toBeGreaterThan(0);
    expect((await repo.listQuestions()).some((question) => question.id === saved.id)).toBe(true);
  });
});
