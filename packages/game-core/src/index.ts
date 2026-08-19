export { createLocalSyncedClock, createOffsetSyncedClock, createPerformanceClock, FakeClock } from "./clock.ts";
export type { Clock, SyncedClock } from "./clock.ts";

export { GameEngine } from "./engine.ts";
export type { StartGameInput } from "./engine.ts";

export { canonicalAnswer, formatResultAnswer, isSecondClose, judgeAnswer, primaryAnswer } from "./judge.ts";
export type { JudgeResult } from "./judge.ts";

export {
  filterAllowedInput,
  isAllowedInput,
  isAllowedInputChar,
  katakanaToHiragana,
  normalizeForJudge,
} from "./normalize.ts";

export { charsOf, visibleCharCount, visibleText } from "./reveal.ts";

export { pickQuestions, filterQuestionsByGenres, randomQuestionPickStrategy } from "./selector.ts";
export type { QuestionPickStrategy } from "./selector.ts";

export {
  combineOffsetEstimates,
  offsetFromProbe,
  offsetFromProbes,
} from "./time-sync.ts";
export type { OffsetEstimate, SyncProbe } from "./time-sync.ts";

export { ruleSetToEngineSettings } from "./rule-set.ts";
export { SOLO_DEFAULT_SETTINGS } from "./types.ts";
export type {
  AnswerReveal,
  AnswerSpec,
  BuzzRecord,
  BuzzView,
  GamePhase,
  GameSettings,
  GameState,
  GameView,
  GaugeKind,
  GaugeView,
  MissPenalty,
  PlayerConfig,
  PlayerIntent,
  PlayerState,
  PlayerView,
  Question,
  QuestionPlayRecord,
  ResultOutcome,
  WinCondition,
  WrongAnswerRule,
} from "./types.ts";
