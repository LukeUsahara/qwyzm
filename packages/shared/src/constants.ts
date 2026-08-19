export const PREVIEW_MS = 1000;

export const CHARS_PER_SECOND = {
  slow: 6,
  normal: 10,
  fast: 16,
} as const;

export type RevealSpeed = keyof typeof CHARS_PER_SECOND;

export const DEFAULT_REVEAL_SPEED: RevealSpeed = "normal";

export const ANSWER_START_MS = 5000;
export const ANSWER_SUBMIT_MS = 7000;
export const NO_BUZZ_MS = 5000;
export const RESULT_MS = 3000;

export const MIN_QUESTIONS_PER_GAME = 1;
export const MAX_QUESTIONS_PER_GAME = 100;
export const MAX_PLAYERS = 16;
export const MIN_PLAYERS_VERSUS = 2;

export const RECENT_AVOID_N = 100;
export const CLOSE_LIMIT = 2;

export const MIN_CORRECT_POINTS = 1;
export const MIN_MISS_POINTS = 1;

export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 24;
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 16;
export const HANDLE_PATTERN = /^[a-z0-9_]{3,16}$/;

export const LONG_VOWEL = "ー";
