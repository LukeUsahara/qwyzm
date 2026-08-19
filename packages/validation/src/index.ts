import { isAllowedInput, normalizeForJudge } from "@qwyzm/game-core";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  MAX_PLAYERS,
  MAX_QUESTIONS_PER_GAME,
  MIN_CORRECT_POINTS,
  MIN_QUESTIONS_PER_GAME,
} from "@qwyzm/shared";
import { z } from "zod";

export const answerInputSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isAllowedInput(value), {
    message: "ひらがな・英数字・長音のみ入力できます",
  });

export const questionCountSchema = z
  .number()
  .int()
  .min(MIN_QUESTIONS_PER_GAME)
  .max(MAX_QUESTIONS_PER_GAME);

export const playerCountSchema = z.number().int().min(1).max(MAX_PLAYERS);

export const correctPointsSchema = z.number().int().min(MIN_CORRECT_POINTS);

export const uuidSchema = z.string().uuid();

export const genreIdsQuerySchema = z.array(uuidSchema);

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH)
  .max(DISPLAY_NAME_MAX_LENGTH);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH)
  .max(HANDLE_MAX_LENGTH)
  .regex(HANDLE_PATTERN, "handle は英数字と _ のみです");

export const isoDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "invalid datetime",
});

export const soloStartSchema = z.object({
  displayName: displayNameSchema,
  questionCount: questionCountSchema,
  selectedGenreIds: z.array(uuidSchema),
});

export const storedAttemptSchema = z.object({
  id: uuidSchema,
  gameId: uuidSchema,
  questionId: uuidSchema,
  questionIndex: z.number().int().min(0),
  questionBody: z.string().min(1),
  genreIds: z.array(uuidSchema),
  result: z.enum(["correct", "incorrect", "unanswered"]),
  answerRaw: z.string().nullable(),
  answerReveal: z.string(),
  buzzTimeMs: z.number().nullable(),
  buzzCharIndex: z.number().int().nullable(),
  buzzRank: z.number().int().nullable(),
  answerStartMs: z.number().nullable(),
  answerSubmitMs: z.number().nullable(),
  closeCount: z.number().int().min(0),
});

export const storedGameSchema = z.object({
  id: uuidSchema,
  mode: z.literal("solo"),
  startedAt: isoDateSchema,
  endedAt: isoDateSchema,
  selectedGenreIds: z.array(uuidSchema),
  questionCount: questionCountSchema,
  score: z.number().int(),
  attempts: z.array(storedAttemptSchema).min(1),
});

export const namedAnswerWriteSchema = z.object({
  displayText: z.string().trim().min(1),
  inputText: answerInputSchema,
  silentInputs: z.array(answerInputSchema).default([]),
});

export const catalogQuestionWriteSchema = z
  .object({
    id: uuidSchema.optional(),
    body: z.string().trim().min(1),
    primary: namedAnswerWriteSchema,
    alternates: z.array(namedAnswerWriteSchema).default([]),
    closeInputs: z.array(answerInputSchema).default([]),
    genreIds: z.array(uuidSchema),
    status: z.enum(["official", "draft"]).default("official"),
  })
  .refine(
    (value) => {
      const inputs = [
        value.primary.inputText,
        ...value.primary.silentInputs,
        ...value.alternates.flatMap((alternate) => [
          alternate.inputText,
          ...alternate.silentInputs,
        ]),
        ...value.closeInputs,
      ].map((input) => normalizeForJudge(input));
      return new Set(inputs).size === inputs.length;
    },
    { message: "同じ入力解が重複しています" },
  );
