import { DEFAULT_GENRE_PLAY_FILTER, type GenrePlayFilter } from "./genre.ts";

export const QUESTION_SET_STORAGE_KEY = "qwyzm.questionSets.v1";
export const LOCAL_QUESTION_SET_PREFIX = "local:";

export const QUESTION_SET_SOURCES = ["filter", "manual"] as const;
export type QuestionSetSource = (typeof QUESTION_SET_SOURCES)[number];

export const QUESTION_SET_VISIBILITIES = ["official", "private"] as const;
export type QuestionSetVisibility = (typeof QUESTION_SET_VISIBILITIES)[number];

export type QuestionSet = {
  id: string;
  name: string;
  ownerId: string | null;
  visibility: QuestionSetVisibility;
  source: QuestionSetSource;
  criteria: GenrePlayFilter;
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export function isLocalQuestionSetId(id: string): boolean {
  return id.startsWith(LOCAL_QUESTION_SET_PREFIX);
}

export function newLocalQuestionSetId(): string {
  return `${LOCAL_QUESTION_SET_PREFIX}${crypto.randomUUID()}`;
}

export function criteriaFromFilter(filter: GenrePlayFilter): GenrePlayFilter {
  return {
    allMain: filter.allMain,
    selectedGenreIds: [...filter.selectedGenreIds],
    includeUnique: filter.includeUnique,
    selectedUniqueGenreIds: [...filter.selectedUniqueGenreIds],
  };
}

export function emptyQuestionSet(partial: Partial<QuestionSet> & Pick<QuestionSet, "id" | "name">): QuestionSet {
  const now = new Date().toISOString();
  const criteria = criteriaFromFilter(partial.criteria ?? DEFAULT_GENRE_PLAY_FILTER);
  return {
    ownerId: null,
    visibility: "private",
    source: "filter",
    questionIds: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
    criteria,
  };
}
