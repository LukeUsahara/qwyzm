import type { RevealSpeed } from "./constants.ts";
import { DEFAULT_REVEAL_SPEED, MIN_CORRECT_POINTS, MIN_MISS_POINTS } from "./constants.ts";
import { DEFAULT_GENRE_PLAY_FILTER, type GenrePlayFilter } from "./genre.ts";

export const USER_SETTINGS_STORAGE_KEY = "qwyzm.settings.v1";
export const USER_SETTINGS_VERSION = 1 as const;

/** Rules implemented in game-core today. Others stay typed in engine only. */
export const IMPLEMENTED_WRONG_ANSWER_RULES = [
  "end_question",
  "resume_from_position",
  "no_one_else",
  "reread",
  "next_fastest",
] as const;

export type ImplementedWrongAnswerRule =
  (typeof IMPLEMENTED_WRONG_ANSWER_RULES)[number];

export const MISS_PENALTIES = ["none", "minus_points"] as const;
export type MissPenaltySetting = (typeof MISS_PENALTIES)[number];

export const WIN_CONDITIONS = ["first_to_points", "highest_after_n"] as const;
export type WinConditionSetting = (typeof WIN_CONDITIONS)[number];

export const REVEAL_SPEEDS = ["slow", "normal", "fast"] as const;

export type RuleSet = {
  questionCount: number;
  genreFilter: GenrePlayFilter;
  /** Selected question set, or null to pick by genre filter. */
  questionSetId: string | null;
  correctPoints: number;
  missPenalty: MissPenaltySetting;
  missPoints: number;
  winCondition: WinConditionSetting;
  targetPoints: number;
  revealSpeed: RevealSpeed;
  wrongAnswerRule: ImplementedWrongAnswerRule;
  maxRereads: number;
};

export type KeyBindSettings = {
  /** `KeyboardEvent.code`, e.g. `"Space"`. */
  buzzCode: string;
};

export type VolumeSettings = {
  master: number;
  bgm: number;
  se: number;
};

export type UserSettings = {
  version: typeof USER_SETTINGS_VERSION;
  ruleSet: RuleSet;
  keyBind: KeyBindSettings;
  volume: VolumeSettings;
  showQuestionGenre: boolean;
};

export const DEFAULT_RULE_SET: RuleSet = {
  questionCount: 5,
  genreFilter: DEFAULT_GENRE_PLAY_FILTER,
  questionSetId: null,
  correctPoints: MIN_CORRECT_POINTS,
  missPenalty: "none",
  missPoints: MIN_MISS_POINTS,
  winCondition: "highest_after_n",
  targetPoints: 5,
  revealSpeed: DEFAULT_REVEAL_SPEED,
  wrongAnswerRule: "end_question",
  maxRereads: 1,
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  version: USER_SETTINGS_VERSION,
  ruleSet: DEFAULT_RULE_SET,
  keyBind: { buzzCode: "Space" },
  volume: { master: 80, bgm: 50, se: 70 },
  showQuestionGenre: false,
};

export const FORBIDDEN_BUZZ_CODES = [
  "Enter",
  "NumpadEnter",
  "Tab",
  "Escape",
  "MetaLeft",
  "MetaRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
] as const;

export function isAllowedBuzzCode(code: string): boolean {
  if (code.length === 0) {
    return false;
  }
  return !FORBIDDEN_BUZZ_CODES.includes(
    code as (typeof FORBIDDEN_BUZZ_CODES)[number],
  );
}

export function labelForKeyCode(code: string): string {
  if (code === "Space") {
    return "Space";
  }
  if (code.startsWith("Key") && code.length === 4) {
    return code.slice(3);
  }
  if (code.startsWith("Digit") && code.length === 6) {
    return code.slice(5);
  }
  return code;
}

export const REVEAL_SPEED_LABEL: Record<RevealSpeed, string> = {
  slow: "遅い",
  normal: "普通",
  fast: "速い",
};

export const WRONG_ANSWER_RULE_LABEL: Record<ImplementedWrongAnswerRule, string> =
  {
    end_question: "その問題を終了",
    resume_from_position: "押した位置から再開",
    no_one_else: "本文は止め、他者は押せる",
    reread: "先頭から読み直し",
    next_fastest: "次に早かった人へ",
  };

export const MISS_PENALTY_LABEL: Record<MissPenaltySetting, string> = {
  none: "なし",
  minus_points: "減点",
};

export const WIN_CONDITION_LABEL: Record<WinConditionSetting, string> = {
  first_to_points: "先取",
  highest_after_n: "指定問数の合計",
};
