export type {
  NamedAnswer,
  QuestionCatalogItem,
  QuestionSource,
  QuestionStatus,
  QuestionTts,
  PlayDataDocument,
  StoredAttempt,
  StoredGame,
  StoredGameMode,
} from "./types.ts";
export { toPlayQuestion } from "./types.ts";
export {
  catalogAnswersFromRows,
  emptyNamedAnswer,
  flattenCatalogAnswers,
  namedAnswer,
} from "./answers.ts";

export type { PlayRepository } from "./repository.ts";
export { createMemoryPlayRepository } from "./repository.ts";

export type { QuestionListFilter, QuestionRepository } from "./question-repository.ts";
export {
  createMemoryQuestionRepository,
  filterCatalogByGenres,
  isOfficialQuestion,
  resolveGenrePlayFilter,
} from "./question-repository.ts";

export { GENRE, GENRES } from "./fixtures/genres.ts";
export { FIXTURE_QUESTIONS } from "./fixtures/questions.ts";

export { hashSeed, mulberry32 } from "./seeded-random.ts";
export {
  questionsFromResolvedIds,
  resolveQuestionSetIds,
} from "./question-set.ts";
export type {
  QuestionSetActor,
  QuestionSetRepository,
} from "./question-set-repository.ts";
export {
  canReadSet,
  canWriteSet,
  createMemoryQuestionSetRepository,
} from "./question-set-repository.ts";
export { createJsonQuestionSetStore } from "./json-question-sets.ts";
export type { QuestionSetDocument } from "./json-question-sets.ts";

export {
  PLAY_DATA_STORAGE_KEY,
  createJsonPlayRepository,
  createMemoryKeyValueStore,
} from "./json-repository.ts";
export type { KeyValueStore } from "./json-repository.ts";

export { attemptsFromPlayRecords, createStoredGame, normalizeStoredGame, storedGameModeFromDb, storedGameModeToDb } from "./map-from-engine.ts";

export {
  analyzeSession,
  compareGrowth,
  compareQuestionBuzz,
  summarizeAttempts,
  summarizeByGenre,
  summarizeProfile,
} from "./stats.ts";
export type {
  AttemptStats,
  GenreStats,
  GrowthComparison,
  MetricComparison,
  QuestionBuzzComparison,
  SessionAnalysis,
} from "./stats.ts";

export {
  NO_COMPARISON_MESSAGE,
  NO_QUESTION_BUZZ_AVERAGE_MESSAGE,
  describeAccuracyGrowth,
  describeAnswerTimeGrowth,
  describeGrowth,
  describeQuestionBuzz,
} from "./growth.ts";
