import type { Genre } from "@qwyzm/shared";
import { rootGenreIds } from "@qwyzm/shared";
import type { StoredAttempt, StoredGame } from "./types.ts";

export type AttemptStats = {
  total: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  /** 0..1. Null when there are no attempts. */
  accuracy: number | null;
  averageAnswerSubmitMs: number | null;
};

export type GenreStats = {
  genreId: string;
  name: string;
  stats: AttemptStats;
};

export type MetricComparison = {
  previous: number;
  current: number;
  /** Interpretation depends on metric. */
  delta: number;
};

export type GrowthComparison = {
  accuracy: MetricComparison | null;
  answerSubmitMs: MetricComparison | null;
};

/** Buzz position compared only against the same questionId. */
export type QuestionBuzzComparison = {
  questionId: string;
  questionIndex: number;
  current: number | null;
  previousAverage: number | null;
  previousSampleCount: number;
  /** previousAverage - current. Positive means an earlier buzz. */
  delta: number | null;
};

export type SessionAnalysis = {
  current: AttemptStats;
  byGenre: GenreStats[];
  growth: GrowthComparison;
  byQuestion: QuestionBuzzComparison[];
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeAttempts(
  attempts: readonly StoredAttempt[],
): AttemptStats {
  const correctCount = attempts.filter((a) => a.result === "correct").length;
  const incorrectCount = attempts.filter((a) => a.result === "incorrect").length;
  const unansweredCount = attempts.filter((a) => a.result === "unanswered").length;
  const total = attempts.length;
  return {
    total,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy: total === 0 ? null : correctCount / total,
    averageAnswerSubmitMs: average(
      attempts.flatMap((a) =>
        a.answerSubmitMs === null ? [] : [a.answerSubmitMs],
      ),
    ),
  };
}

export function summarizeByGenre(
  attempts: readonly StoredAttempt[],
  genres: Genre[],
): GenreStats[] {
  const buckets = new Map<string, StoredAttempt[]>();
  for (const attempt of attempts) {
    const roots = rootGenreIds(genres, attempt.genreIds);
    for (const genreId of roots) {
      const list = buckets.get(genreId) ?? [];
      list.push(attempt);
      buckets.set(genreId, list);
    }
  }
  const nameOf = new Map(genres.map((genre) => [genre.id, genre.name]));
  return [...buckets.entries()]
    .map(([genreId, list]) => ({
      genreId,
      name: nameOf.get(genreId) ?? genreId,
      stats: summarizeAttempts(list),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function compareMetric(
  previous: number | null,
  current: number | null,
  delta: (prev: number, curr: number) => number,
): MetricComparison | null {
  if (previous === null || current === null) {
    return null;
  }
  return {
    previous,
    current,
    delta: delta(previous, current),
  };
}

export function compareQuestionBuzz(
  currentAttempts: readonly StoredAttempt[],
  previousGames: readonly StoredGame[],
): QuestionBuzzComparison[] {
  const previousByQuestion = new Map<string, number[]>();
  for (const attempt of previousGames.flatMap((game) => game.attempts)) {
    if (attempt.buzzCharIndex === null) {
      continue;
    }
    const list = previousByQuestion.get(attempt.questionId) ?? [];
    list.push(attempt.buzzCharIndex);
    previousByQuestion.set(attempt.questionId, list);
  }

  return currentAttempts.map((attempt) => {
    const samples = previousByQuestion.get(attempt.questionId) ?? [];
    const previousAverage = average(samples);
    const current = attempt.buzzCharIndex;
    return {
      questionId: attempt.questionId,
      questionIndex: attempt.questionIndex,
      current,
      previousAverage,
      previousSampleCount: samples.length,
      delta:
        previousAverage === null || current === null
          ? null
          : previousAverage - current,
    };
  });
}

/** Current game versus all earlier games. Buzz position is per-question only. */
export function analyzeSession(input: {
  currentAttempts: readonly StoredAttempt[];
  previousGames: readonly StoredGame[];
  genres: Genre[];
}): SessionAnalysis {
  return {
    current: summarizeAttempts(input.currentAttempts),
    byGenre: summarizeByGenre(input.currentAttempts, input.genres),
    growth: compareGrowth(input.currentAttempts, input.previousGames),
    byQuestion: compareQuestionBuzz(input.currentAttempts, input.previousGames),
  };
}

export function compareGrowth(
  currentAttempts: readonly StoredAttempt[],
  previousGames: readonly StoredGame[],
): GrowthComparison {
  const previousAttempts = previousGames.flatMap((game) => game.attempts);
  const current = summarizeAttempts(currentAttempts);
  const previous = summarizeAttempts(previousAttempts);
  return {
    accuracy: compareMetric(
      previous.accuracy,
      current.accuracy,
      (prev, curr) => curr - prev,
    ),
    answerSubmitMs: compareMetric(
      previous.averageAnswerSubmitMs,
      current.averageAnswerSubmitMs,
      (prev, curr) => prev - curr,
    ),
  };
}
