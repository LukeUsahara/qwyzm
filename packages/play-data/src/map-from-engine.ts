import type { QuestionPlayRecord } from "@qwyzm/game-core";
import type { StoredAttempt, StoredGame } from "./types.ts";

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

export function createStoredGame(input: {
  id: string;
  startedAt: string;
  endedAt?: string;
  selectedGenreIds: string[];
  score: number;
  records: readonly QuestionPlayRecord[];
}): StoredGame {
  return {
    id: input.id,
    mode: "solo",
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? new Date().toISOString(),
    selectedGenreIds: [...input.selectedGenreIds],
    questionCount: input.records.length,
    score: input.score,
    attempts: attemptsFromPlayRecords(input.id, input.records),
  };
}
