import type { AnswerSpec, Question, ResultOutcome } from "@qwyzm/game-core";
import type { DifficultyRank } from "@qwyzm/shared";
import { flattenCatalogAnswers, type NamedAnswer } from "./answers.ts";

export type QuestionStatus = "official" | "draft" | "user";

export type QuestionSource = {
  text: string;
  url?: string;
};

export type QuestionTts = {
  notes?: string;
};

export type { NamedAnswer };

/**
 * Catalog shape. Play engine only needs `toPlayQuestion()`.
 */
export type QuestionCatalogItem = {
  id: string;
  body: string;
  primary: NamedAnswer;
  alternates: NamedAnswer[];
  closeInputs: string[];
  genreIds: string[];
  status?: QuestionStatus;
  source?: QuestionSource | null;
  difficultyRank?: DifficultyRank | null;
  tts?: QuestionTts | null;
  createdBy?: string | null;
};

export function toPlayQuestion(item: QuestionCatalogItem): Question {
  const { answers, closeAnswers } = flattenCatalogAnswers(item);
  return {
    id: item.id,
    body: item.body,
    answers,
    closeAnswers,
    genreIds: item.genreIds,
  };
}

export type StoredAttempt = {
  id: string;
  gameId: string;
  questionId: string;
  questionIndex: number;
  questionBody: string;
  genreIds: string[];
  result: ResultOutcome;
  answerRaw: string | null;
  answerReveal: string;
  buzzTimeMs: number | null;
  /** 0-based index of revealed characters at buzz. */
  buzzCharIndex: number | null;
  buzzRank: number | null;
  answerStartMs: number | null;
  answerSubmitMs: number | null;
  closeCount: number;
};

export type StoredGameMode = "solo" | "match";

export type StoredGame = {
  id: string;
  mode: StoredGameMode;
  startedAt: string;
  endedAt: string;
  selectedGenreIds: string[];
  questionCount: number;
  score: number;
  rank: number | null;
  seatIndex: number;
  attempts: StoredAttempt[];
};

export type PlayDataDocument = {
  version: 1;
  games: StoredGame[];
};

export type { AnswerSpec };
