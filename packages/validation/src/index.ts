import { isAllowedInput, normalizeForJudge } from "@qwyzm/game-core";
import {
  DEFAULT_GENRE_PLAY_FILTER,
  DEFAULT_RULE_SET,
  DEFAULT_USER_SETTINGS,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
  IMPLEMENTED_WRONG_ANSWER_RULES,
  MAX_PLAYERS,
  MAX_QUESTIONS_PER_GAME,
  MIN_CORRECT_POINTS,
  MIN_MISS_POINTS,
  MIN_QUESTIONS_PER_GAME,
  MISS_PENALTIES,
  QUESTION_SET_SOURCES,
  QUESTION_SET_VISIBILITIES,
  REVEAL_SPEEDS,
  USER_SETTINGS_VERSION,
  WIN_CONDITIONS,
  isAllowedBuzzCode,
  isLocalQuestionSetId,
  type UserSettings,
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
  mode: z.enum(["solo", "custom_room"]),
  startedAt: isoDateSchema,
  endedAt: isoDateSchema,
  selectedGenreIds: z.array(uuidSchema),
  questionCount: questionCountSchema,
  score: z.number().int(),
  rank: z.number().int().nullable().optional(),
  seatIndex: z.number().int().min(0).optional(),
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

export const genrePlayFilterSchema = z.object({
  allMain: z.boolean(),
  selectedGenreIds: z.array(uuidSchema),
  includeUnique: z.boolean(),
  selectedUniqueGenreIds: z.array(uuidSchema),
});

export const ruleSetSchema = z.object({
  questionCount: questionCountSchema,
  genreFilter: genrePlayFilterSchema.default({
    allMain: DEFAULT_GENRE_PLAY_FILTER.allMain,
    selectedGenreIds: [...DEFAULT_GENRE_PLAY_FILTER.selectedGenreIds],
    includeUnique: DEFAULT_GENRE_PLAY_FILTER.includeUnique,
    selectedUniqueGenreIds: [...DEFAULT_GENRE_PLAY_FILTER.selectedUniqueGenreIds],
  }),
  questionSetId: z
    .union([
      uuidSchema,
      z.string().regex(/^local:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    ])
    .nullable()
    .default(null),
  correctPoints: correctPointsSchema,
  missPenalty: z.enum(MISS_PENALTIES),
  missPoints: z.number().int().min(MIN_MISS_POINTS),
  winCondition: z.enum(WIN_CONDITIONS),
  targetPoints: z.number().int().min(1),
  revealSpeed: z.enum(REVEAL_SPEEDS),
  wrongAnswerRule: z.enum(IMPLEMENTED_WRONG_ANSWER_RULES),
  maxRereads: z.number().int().min(0).max(10).default(1),
});

const volumeSchema = z.object({
  master: z.number().int().min(0).max(100),
  bgm: z.number().int().min(0).max(100),
  se: z.number().int().min(0).max(100),
});

export const userSettingsSchema = z.object({
  version: z.literal(USER_SETTINGS_VERSION),
  ruleSet: ruleSetSchema,
  keyBind: z.object({
    buzzCode: z.string().min(1).refine(isAllowedBuzzCode, {
      message: "このキーは早押しに使えません",
    }),
  }),
  volume: volumeSchema,
  showQuestionGenre: z.boolean(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateSettings(raw: unknown): UserSettings {
  if (!isRecord(raw)) {
    return DEFAULT_USER_SETTINGS;
  }
  const ruleRaw = isRecord(raw.ruleSet) ? raw.ruleSet : raw;
  const parsed = userSettingsSchema.safeParse({
    version: USER_SETTINGS_VERSION,
    ruleSet: {
      ...DEFAULT_RULE_SET,
      ...ruleRaw,
      questionSetId: ruleRaw.questionSetId ?? null,
      genreFilter: isRecord(ruleRaw.genreFilter)
        ? { ...DEFAULT_GENRE_PLAY_FILTER, ...ruleRaw.genreFilter }
        : DEFAULT_RULE_SET.genreFilter,
    },
    keyBind: isRecord(raw.keyBind)
      ? { ...DEFAULT_USER_SETTINGS.keyBind, ...raw.keyBind }
      : DEFAULT_USER_SETTINGS.keyBind,
    volume: isRecord(raw.volume)
      ? { ...DEFAULT_USER_SETTINGS.volume, ...raw.volume }
      : DEFAULT_USER_SETTINGS.volume,
    showQuestionGenre:
      typeof raw.showQuestionGenre === "boolean"
        ? raw.showQuestionGenre
        : DEFAULT_USER_SETTINGS.showQuestionGenre,
  });
  return parsed.success ? parsed.data : DEFAULT_USER_SETTINGS;
}

export const localQuestionSetIdSchema = z
  .string()
  .regex(
    /^local:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "local set id",
  );

export const questionSetRefSchema = z.union([uuidSchema, localQuestionSetIdSchema]);

export const questionSetWriteSchema = z.object({
  id: questionSetRefSchema.optional(),
  name: z.string().trim().min(1).max(80),
  visibility: z.enum(QUESTION_SET_VISIBILITIES).default("private"),
  source: z.enum(QUESTION_SET_SOURCES),
  criteria: genrePlayFilterSchema.default({
    allMain: DEFAULT_GENRE_PLAY_FILTER.allMain,
    selectedGenreIds: [...DEFAULT_GENRE_PLAY_FILTER.selectedGenreIds],
    includeUnique: DEFAULT_GENRE_PLAY_FILTER.includeUnique,
    selectedUniqueGenreIds: [...DEFAULT_GENRE_PLAY_FILTER.selectedUniqueGenreIds],
  }),
  questionIds: z.array(uuidSchema).default([]),
});

export const questionSetHttpWriteSchema = questionSetWriteSchema.extend({
  id: uuidSchema.optional(),
});

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const roomCodeSchema = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`));

export const roomRuleSetSchema = ruleSetSchema.refine(
  (ruleSet) => ruleSet.questionSetId === null || !isLocalQuestionSetId(ruleSet.questionSetId),
  { message: "local question sets cannot be used in rooms" },
);

export const clientRoomMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    displayName: displayNameSchema,
    ruleSet: ruleSetSchema,
  }),
  z.object({
    type: z.literal("join"),
    displayName: displayNameSchema,
    roomCode: roomCodeSchema,
    reconnectToken: uuidSchema.optional(),
  }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("kick"), playerId: uuidSchema }),
  z.object({ type: z.literal("update_rules"), ruleSet: ruleSetSchema }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("ping"), t0: z.number() }),
  z.object({
    type: z.literal("buzz"),
    clientTime: z.number(),
    seq: z.number().int(),
  }),
  z.object({ type: z.literal("answer_start"), clientTime: z.number() }),
  z.object({
    type: z.literal("answer_input"),
    text: z.string(),
    clientTime: z.number(),
  }),
  z.object({
    type: z.literal("answer_submit"),
    text: z.string(),
    clientTime: z.number(),
  }),
  z.object({
    type: z.literal("resume"),
    roomCode: roomCodeSchema,
    reconnectToken: uuidSchema,
  }),
]);

export type ClientRoomMessage = z.infer<typeof clientRoomMessageSchema>;

export const playQuestionsRequestSchema = z.object({
  questionSetId: uuidSchema.nullable(),
  genreFilter: genrePlayFilterSchema,
  count: questionCountSchema,
  seed: z.string().min(1).max(80),
});


