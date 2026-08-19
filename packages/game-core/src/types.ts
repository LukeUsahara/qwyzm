import type { RevealSpeed } from "@qwyzm/shared";

export type AnswerReveal = "primary" | "silent" | "alternate";

export type AnswerSpec = {
  displayText: string;
  /** Hiragana / latin / digits used for judging. Computed if omitted. */
  normalizedText?: string;
  /**
   * Result screen:
   * - primary: the one shown by default (first answer if omitted)
   * - silent: accepted for judging only (variants, readings)
   * - alternate: if the player used this distinct name, show `primary（this）`
   */
  reveal?: AnswerReveal;
};

export type Question = {
  id: string;
  body: string;
  answers: AnswerSpec[];
  closeAnswers: AnswerSpec[];
  genreIds: string[];
};

export type WrongAnswerRule =
  | "end_question"
  | "resume_from_position"
  | "no_one_else"
  | "reread"
  | "next_fastest";

export type MissPenalty = "none" | "minus_points";

export type WinCondition = "first_to_points" | "highest_after_n";

export type GameSettings = {
  questionCount: number;
  correctPoints: number;
  missPenalty: MissPenalty;
  missPoints: number;
  winCondition: WinCondition;
  targetPoints: number;
  revealSpeed: RevealSpeed;
  wrongAnswerRule: WrongAnswerRule;
};

export type PlayerConfig = {
  id: string;
  displayName: string;
  seatIndex: number;
};

export type PlayerState = PlayerConfig & {
  score: number;
  withdrawn: boolean;
};

export type ResultOutcome = "correct" | "incorrect" | "unanswered";

export type BuzzRecord = {
  playerId: string;
  syncedAt: number;
  charIndex: number;
  timeFromReadingMs: number;
};

export type GamePhase =
  | { type: "idle" }
  | {
      type: "preview";
      questionIndex: number;
      deadlineAt: number;
    }
  | {
      type: "reading";
      questionIndex: number;
      readingStartedAt: number;
      segmentStartedAt: number;
      committedCount: number;
    }
  | {
      type: "waitingBuzz";
      questionIndex: number;
      readingStartedAt: number;
      deadlineAt: number;
    }
  | {
      type: "answeringWaitInput";
      questionIndex: number;
      readingStartedAt: number;
      playerId: string;
      deadlineAt: number;
      buzzAt: number;
      buzzCharIndex: number;
    }
  | {
      type: "answering";
      questionIndex: number;
      readingStartedAt: number;
      playerId: string;
      deadlineAt: number;
      input: string;
      closeCount: number;
      buzzAt: number;
      buzzCharIndex: number;
      prompt: string | null;
      answerStartedAt: number;
    }
  | {
      type: "showingResult";
      questionIndex: number;
      deadlineAt: number;
      outcome: ResultOutcome;
      submitted: string | null;
      buzzAt: number | null;
      buzzCharIndex: number | null;
    }
  | { type: "gameOver" };

export type QuestionPlayRecord = {
  questionId: string;
  questionIndex: number;
  questionBody: string;
  playerId: string | null;
  result: ResultOutcome;
  answerRaw: string | null;
  answerReveal: string;
  buzzTimeMs: number | null;
  buzzCharIndex: number | null;
  buzzRank: number | null;
  answerStartMs: number | null;
  answerSubmitMs: number | null;
  closeCount: number;
  /** Snapshot of the question's genres at play time. */
  genreIds: string[];
};

export type GameState = {
  settings: GameSettings;
  players: PlayerState[];
  questions: Question[];
  phase: GamePhase;
  lockedPlayerIds: string[];
  buzzes: BuzzRecord[];
  playRecords: QuestionPlayRecord[];
};

export type PlayerIntent =
  | { type: "BUZZ" }
  | { type: "ANSWER_START" }
  | { type: "ANSWER_INPUT"; value: string }
  | { type: "ANSWER_SUBMIT" };

export type GaugeKind =
  | "preview"
  | "noBuzz"
  | "answerStart"
  | "answerSubmit"
  | "result";

export type GaugeView = {
  kind: GaugeKind;
  remainingMs: number;
  totalMs: number;
  ratio: number;
};

export type PlayerView = {
  id: string;
  displayName: string;
  seatIndex: number;
  score: number;
  rank: number;
  withdrawn: boolean;
};

export type BuzzView = {
  playerId: string;
  displayName: string;
  timeFromReadingMs: number;
  charIndex: number;
};

export type GameView = {
  phase: GamePhase["type"];
  questionIndex: number | null;
  questionCount: number;
  questionId: string | null;
  questionNumber: number | null;
  questionTextVisible: boolean;
  visibleText: string;
  fullText: string | null;
  /** Single result-screen answer, e.g. "H2O" or "エベレスト（チョモランマ）". */
  answerReveal: string | null;
  /** Player's submitted input on the result screen. Null if they never typed. */
  submittedAnswer: string | null;
  canBuzz: boolean;
  canAnswer: boolean;
  answeringPlayerId: string | null;
  inputValue: string;
  prompt: string | null;
  gauges: GaugeView[];
  players: PlayerView[];
  buzzes: BuzzView[];
  outcome: ResultOutcome | null;
  statusLabel: string;
  lockedPlayerIds: string[];
  playRecords: QuestionPlayRecord[];
};

export const SOLO_DEFAULT_SETTINGS: GameSettings = {
  questionCount: 5,
  correctPoints: 1,
  missPenalty: "none",
  missPoints: 1,
  winCondition: "highest_after_n",
  targetPoints: 5,
  revealSpeed: "normal",
  wrongAnswerRule: "end_question",
};
