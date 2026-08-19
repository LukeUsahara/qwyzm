import {
  MAX_QUESTIONS_PER_GAME,
  RECENT_AVOID_N,
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

export type QuestionPickStrategy = {
  pick(
    pool: Question[],
    count: number,
    random?: () => number,
    avoidIds?: readonly string[],
  ): Question[];
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
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
  return copy;
}

export function pickQuestions(
  pool: Question[],
  count: number,
  random: () => number = Math.random,
  avoidIds: readonly string[] = [],
): Question[] {
  const n = Math.min(
    Math.max(0, count),
    MAX_QUESTIONS_PER_GAME,
    pool.length,
  );
  if (n === 0) {
    return [];
  }
  const avoid = new Set(avoidIds.slice(-RECENT_AVOID_N));
  const preferred = pool.filter((question) => !avoid.has(question.id));
  const fallback = pool.filter((question) => avoid.has(question.id));
  return [...shuffle(preferred, random), ...shuffle(fallback, random)].slice(0, n);
}

export function randomQuestionPickStrategy(): QuestionPickStrategy {
  return { pick: pickQuestions };
}
