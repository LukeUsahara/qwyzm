import type { Genre, GenrePlayFilter } from "@qwyzm/shared";
import {
  DEFAULT_GENRE_PLAY_FILTER,
  allowedGenreIdsForPlay,
  questionMatchesGenreFilter,
} from "@qwyzm/shared";
import type { QuestionCatalogItem } from "./types.ts";

export type QuestionListFilter = {
  allMain?: boolean;
  /** Empty with allMain omitted means every main leaf. */
  genreIds?: readonly string[];
  includeUnique?: boolean;
  uniqueGenreIds?: readonly string[];
  /** When true, draft / user questions are included. Play uses official only. */
  includeUnpublished?: boolean;
};

export interface QuestionRepository {
  listGenres(): Promise<Genre[]>;
  listQuestions(filter?: QuestionListFilter): Promise<QuestionCatalogItem[]>;
  getQuestion(id: string): Promise<QuestionCatalogItem | null>;
  saveQuestion(item: QuestionCatalogItem): Promise<QuestionCatalogItem>;
}

export function isOfficialQuestion(item: QuestionCatalogItem): boolean {
  return (item.status ?? "official") === "official";
}

export function resolveGenrePlayFilter(filter?: QuestionListFilter): GenrePlayFilter {
  if (filter === undefined) {
    return DEFAULT_GENRE_PLAY_FILTER;
  }
  const hasIds = (filter.genreIds?.length ?? 0) > 0;
  return {
    allMain: filter.allMain ?? !hasIds,
    selectedGenreIds: filter.genreIds ?? [],
    includeUnique: filter.includeUnique ?? false,
    selectedUniqueGenreIds: filter.uniqueGenreIds ?? [],
  };
}

export function filterCatalogByGenres(
  questions: readonly QuestionCatalogItem[],
  genres: readonly Genre[],
  filter: GenrePlayFilter | readonly string[] = DEFAULT_GENRE_PLAY_FILTER,
): QuestionCatalogItem[] {
  const playFilter: GenrePlayFilter =
    "allMain" in filter
      ? filter
      : {
          allMain: filter.length === 0,
          selectedGenreIds: [...filter],
          includeUnique: false,
          selectedUniqueGenreIds: [],
        };
  const allowed = allowedGenreIdsForPlay(genres, playFilter);
  if (allowed.size === 0) {
    return [];
  }
  return questions.filter((question) =>
    questionMatchesGenreFilter(question.genreIds, allowed),
  );
}

export function createMemoryQuestionRepository(input: {
  genres: readonly Genre[];
  questions: readonly QuestionCatalogItem[];
}): QuestionRepository {
  const genres = input.genres.map((genre) => ({ ...genre }));
  const questions: QuestionCatalogItem[] = input.questions.map((question) =>
    structuredClone(question),
  );

  return {
    async listGenres() {
      return [...genres].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async listQuestions(filter) {
      const listed = filterCatalogByGenres(
        questions,
        genres,
        resolveGenrePlayFilter(filter),
      );
      if (filter?.includeUnpublished) {
        return listed;
      }
      return listed.filter(isOfficialQuestion);
    },
    async getQuestion(id) {
      return questions.find((question) => question.id === id) ?? null;
    },
    async saveQuestion(item) {
      const id = item.id.length > 0 ? item.id : crypto.randomUUID();
      const stored: QuestionCatalogItem = { ...structuredClone(item), id };
      const index = questions.findIndex((question) => question.id === id);
      if (index === -1) {
        questions.push(stored);
      } else {
        questions[index] = stored;
      }
      return structuredClone(stored);
    },
  };
}
