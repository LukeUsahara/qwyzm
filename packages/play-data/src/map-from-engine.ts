import type { QuestionPlayRecord } from "@qwyzm/game-core";
import type { StoredAttempt, StoredGame, StoredGameMode } from "./types.ts";

function newId(): string {
  return crypto.randomUUID();
}

export function attemptsFromPlayRecords(
  gameId: string,
  records: readonly QuestionPlayRecord[],
): StoredAttempt[] {
  return records.map((record) => ({
    id: newId(),
    gameId,
    questionId: record.questionId,
    questionIndex: record.questionIndex,
    questionBody: record.questionBody,
    genreIds: [...record.genreIds],
    result: record.result,
    answerRaw: record.answerRaw,
    answerReveal: record.answerReveal,
    buzzTimeMs: record.buzzTimeMs,
    buzzCharIndex: record.buzzCharIndex,
    buzzRank: record.buzzRank,
    answerStartMs: record.answerStartMs,
    answerSubmitMs: record.answerSubmitMs,
    closeCount: record.closeCount,
  }));
}

export function normalizeStoredGame(game: StoredGame): StoredGame {
  return {
    ...game,
    mode: game.mode === "custom_room" ? "custom_room" : "solo",
    rank: game.rank ?? null,
    seatIndex: game.seatIndex ?? 0,
    selectedGenreIds: [...game.selectedGenreIds],
    attempts: game.attempts.map((attempt) => ({
      ...attempt,
      genreIds: [...attempt.genreIds],
    })),
  };
}

export function createStoredGame(input: {
  id: string;
  mode?: StoredGameMode;
  startedAt: string;
  endedAt?: string;
  selectedGenreIds: string[];
  questionCount?: number;
  score: number;
  rank?: number | null;
  seatIndex?: number;
  records: readonly QuestionPlayRecord[];
}): StoredGame {
  return {
    id: input.id,
    mode: input.mode ?? "solo",
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? new Date().toISOString(),
    selectedGenreIds: [...input.selectedGenreIds],
    questionCount: input.questionCount ?? input.records.length,
    score: input.score,
    rank: input.rank ?? null,
    seatIndex: input.seatIndex ?? 0,
    attempts: attemptsFromPlayRecords(input.id, input.records),
  };
}
