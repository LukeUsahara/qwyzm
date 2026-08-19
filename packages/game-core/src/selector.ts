import {
  MAX_QUESTIONS_PER_GAME,
  allowedGenreIdsForPlay,
  questionMatchesGenreFilter,
  type Genre,
  type GenrePlayFilter,
} from "@qwyzm/shared";
import type { Question } from "./types.ts";

export function filterQuestionsByGenres(
  pool: Question[],
  genres: Genre[],
  filter: GenrePlayFilter | readonly string[],
): Question[] {
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
  return pool.filter((question) => questionMatchesGenreFilter(question.genreIds, allowed));
}

/** Swap later for unseen-first / miss-first / avoid-recent. */
export type QuestionPickStrategy = {
  pick(
    pool: Question[],
    count: number,
    random?: () => number,
  ): Question[];
};

export function pickQuestions(
  pool: Question[],
  count: number,
  random: () => number = Math.random,
): Question[] {
  const n = Math.min(
    Math.max(0, count),
    MAX_QUESTIONS_PER_GAME,
    pool.length,
  );
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = copy[i];
    const swap = copy[j];
    if (current === undefined || swap === undefined) {
      continue;
    }
    copy[i] = swap;
    copy[j] = current;
  }
  return copy.slice(0, n);
}

export function randomQuestionPickStrategy(): QuestionPickStrategy {
  return { pick: pickQuestions };
}
