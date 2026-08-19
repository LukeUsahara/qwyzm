import { describe, expect, it } from "vitest";
import { DEFAULT_GENRE_PLAY_FILTER, emptyQuestionSet } from "@qwyzm/shared";
import { GENRE, GENRES } from "./fixtures/genres.ts";
import { FIXTURE_QUESTIONS } from "./fixtures/questions.ts";
import {
  createMemoryQuestionSetRepository,
} from "./question-set-repository.ts";
import { questionsFromResolvedIds, resolveQuestionSetIds } from "./question-set.ts";

const FUJI = "c0a80100-0000-4000-8000-000000000001";
const PEARL = "c0a80100-0000-4000-8000-000000000002";

describe("resolveQuestionSetIds", () => {
  it("uses the genre filter when no set is selected", () => {
    const ids = resolveQuestionSetIds({
      set: null,
      genreFilter: {
        allMain: false,
        selectedGenreIds: [GENRE.geography],
        includeUnique: false,
        selectedUniqueGenreIds: [],
      },
      catalog: FIXTURE_QUESTIONS,
      genres: GENRES,
    });
    expect(ids.includes(FUJI)).toBe(true);
    expect(ids.includes(PEARL)).toBe(false);
  });

  it("keeps manual order and drops unknown ids", () => {
    const set = emptyQuestionSet({
      id: "c0a80600-0000-4000-8000-000000000001",
      name: "手選び",
      source: "manual",
      questionIds: [PEARL, "missing", FUJI],
    });
    expect(
      resolveQuestionSetIds({
        set,
        catalog: FIXTURE_QUESTIONS,
        genres: GENRES,
      }),
    ).toEqual([PEARL, FUJI]);
    expect(
      questionsFromResolvedIds(FIXTURE_QUESTIONS, [PEARL, FUJI]).map((item) => item.id),
    ).toEqual([PEARL, FUJI]);
  });

  it("resolves a filter set the same way as a null genre pick", () => {
    const filter = {
      allMain: false,
      selectedGenreIds: [GENRE.geography],
      includeUnique: false,
      selectedUniqueGenreIds: [],
    };
    const set = emptyQuestionSet({
      id: "c0a80600-0000-4000-8000-000000000002",
      name: "地理",
      source: "filter",
      criteria: filter,
    });
    expect(
      resolveQuestionSetIds({
        set,
        catalog: FIXTURE_QUESTIONS,
        genres: GENRES,
      }),
    ).toEqual(
      resolveQuestionSetIds({
        set: null,
        genreFilter: filter,
        catalog: FIXTURE_QUESTIONS,
        genres: GENRES,
      }),
    );
    expect(DEFAULT_GENRE_PLAY_FILTER.allMain).toBe(true);
  });
});

describe("memory QuestionSetRepository", () => {
  const user = { id: "c0a80300-0000-4000-8000-000000000001", role: "user" as const };
  const other = { id: "c0a80300-0000-4000-8000-000000000002", role: "user" as const };
  const admin = { id: "c0a80300-0000-4000-8000-00000000ad01", role: "admin" as const };

  it("hides private sets from other users and guests", async () => {
    const repo = createMemoryQuestionSetRepository();
    const saved = await repo.saveSet(
      emptyQuestionSet({
        id: "c0a80600-0000-4000-8000-000000000010",
        name: "Alice専用",
        visibility: "private",
        source: "filter",
      }),
      user,
    );
    expect(saved.ownerId).toBe(user.id);
    expect(await repo.getSet(saved.id, other)).toBeNull();
    expect(await repo.getSet(saved.id, null)).toBeNull();
    expect((await repo.listSets(user)).map((set) => set.id)).toEqual([saved.id]);
    expect(await repo.listSets(other)).toEqual([]);
  });

  it("lets only admins write official sets", async () => {
    const repo = createMemoryQuestionSetRepository();
    await expect(
      repo.saveSet(
        emptyQuestionSet({
          id: "c0a80600-0000-4000-8000-000000000011",
          name: "公式",
          visibility: "official",
          source: "filter",
        }),
        user,
      ),
    ).rejects.toThrow("forbidden");
    const official = await repo.saveSet(
      emptyQuestionSet({
        id: "c0a80600-0000-4000-8000-000000000011",
        name: "公式",
        visibility: "official",
        source: "filter",
      }),
      admin,
    );
    expect(official.ownerId).toBeNull();
    expect(await repo.getSet(official.id, null)).not.toBeNull();
  });
});
