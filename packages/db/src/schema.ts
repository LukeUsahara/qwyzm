import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const gameModeEnum = pgEnum("game_mode", ["solo", "custom_room"]);
export const winConditionEnum = pgEnum("win_condition", [
  "first_to_points",
  "highest_after_n",
]);
export const missPenaltyEnum = pgEnum("miss_penalty", ["none", "minus_points"]);
export const wrongAnswerRuleEnum = pgEnum("wrong_answer_rule", [
  "resume_from_position",
  "end_question",
  "no_one_else",
  "reread",
  "next_fastest",
]);
export const revealSpeedEnum = pgEnum("reveal_speed", ["slow", "normal", "fast"]);
export const answerKindEnum = pgEnum("answer_kind", ["correct", "close"]);
export const answerRevealEnum = pgEnum("answer_reveal", [
  "primary",
  "silent",
  "alternate",
]);
export const playResultEnum = pgEnum("play_result", [
  "correct",
  "incorrect",
  "unanswered",
  "withdrawn",
]);
export const difficultyRankEnum = pgEnum("difficulty_rank", [
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S-",
  "S",
  "S+",
  "SS-",
  "SS",
  "SS+",
]);
export const questionStatusEnum = pgEnum("question_status", [
  "official",
  "draft",
  "user",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const genreKindEnum = pgEnum("genre_kind", ["main", "unique"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("display_name").notNull(),
  handle: text("handle").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("accounts_issuer_account_id_idx").on(table.issuer, table.accountId),
  ],
);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const genres = pgTable("genres", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").references((): AnyPgColumn => genres.id),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  kind: genreKindEnum("kind").notNull().default("main"),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  body: text("body").notNull(),
  createdBy: uuid("created_by"),
  status: questionStatusEnum("status").notNull().default("official"),
  difficultyRank: difficultyRankEnum("difficulty_rank"),
  sourceText: text("source_text"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const questionAnswers = pgTable(
  "question_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    kind: answerKindEnum("kind").notNull(),
    displayText: text("display_text").notNull(),
    normalizedText: text("normalized_text").notNull(),
    reveal: answerRevealEnum("reveal").notNull().default("silent"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("question_answers_question_kind_normalized_idx").on(
      table.questionId,
      table.kind,
      table.normalizedText,
    ),
  ],
);

export const questionGenres = pgTable(
  "question_genres",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.genreId] })],
);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  mode: gameModeEnum("mode").notNull(),
  hostUserId: uuid("host_user_id").references(() => users.id),
  questionCount: integer("question_count").notNull(),
  winCondition: winConditionEnum("win_condition").notNull(),
  targetPoints: integer("target_points"),
  correctPoints: integer("correct_points").notNull(),
  missPenalty: missPenaltyEnum("miss_penalty").notNull(),
  missPoints: integer("miss_points"),
  wrongAnswerRule: wrongAnswerRuleEnum("wrong_answer_rule").notNull(),
  revealSpeed: revealSpeedEnum("reveal_speed").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  settings: jsonb("settings").$type<{ selectedGenreIds?: string[] }>().notNull().default({}),
});

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    seatIndex: integer("seat_index").notNull(),
    displayName: text("display_name").notNull(),
    isHost: boolean("is_host").notNull().default(false),
    score: integer("score").notNull().default(0),
    rank: integer("rank"),
    withdrawn: boolean("withdrawn").notNull().default(false),
  },
  (table) => [
    uniqueIndex("game_players_game_seat_idx").on(table.gameId, table.seatIndex),
  ],
);

export const gameQuestions = pgTable(
  "game_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    uniqueIndex("game_questions_game_order_idx").on(table.gameId, table.orderIndex),
  ],
);

export const questionPlayRecords = pgTable(
  "question_play_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    gameQuestionId: uuid("game_question_id")
      .notNull()
      .references(() => gameQuestions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    userId: uuid("user_id").references(() => users.id),
    playerSeat: integer("player_seat").notNull(),
    result: playResultEnum("result").notNull(),
    questionBody: text("question_body").notNull().default(""),
    answerRaw: text("answer_raw"),
    answerNormalized: text("answer_normalized"),
    answerDisplay: text("answer_display").notNull().default(""),
    genreIds: jsonb("genre_ids").$type<string[]>().notNull().default([]),
    buzzTimeMs: doublePrecision("buzz_time_ms"),
    buzzCharIndex: integer("buzz_char_index"),
    buzzRank: integer("buzz_rank"),
    answerStartMs: doublePrecision("answer_start_ms"),
    answerSubmitMs: doublePrecision("answer_submit_ms"),
    closeCount: integer("close_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("question_play_records_question_id_idx").on(table.questionId),
    index("question_play_records_user_created_idx").on(table.userId, table.createdAt),
    index("question_play_records_question_user_created_idx").on(
      table.questionId,
      table.userId,
      table.createdAt,
    ),
  ],
);
