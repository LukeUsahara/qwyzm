import {
  DEFAULT_RULE_SET,
  MAX_QUESTIONS_PER_GAME,
  MIN_QUESTIONS_PER_GAME,
  type GenrePlayFilter,
  type ImplementedWrongAnswerRule,
  type MissPenaltySetting,
  type RevealSpeed,
  type RuleSet,
  type UserRole,
  type WinConditionSetting,
} from "@qwyzm/shared";
import { create } from "zustand";

type SessionState = {
  userId: string | null;
  displayName: string;
  handle: string;
  role: UserRole;
  questionCount: number;
  genreFilter: GenrePlayFilter;
  showQuestionGenre: boolean;
  correctPoints: number;
  missPenalty: MissPenaltySetting;
  missPoints: number;
  winCondition: WinConditionSetting;
  targetPoints: number;
  revealSpeed: RevealSpeed;
  wrongAnswerRule: ImplementedWrongAnswerRule;
  maxRereads: number;
  setDisplayName: (displayName: string) => void;
  setQuestionCount: (questionCount: number) => void;
  setGenreFilter: (genreFilter: GenrePlayFilter) => void;
  setShowQuestionGenre: (showQuestionGenre: boolean) => void;
  setRevealSpeed: (revealSpeed: RevealSpeed) => void;
  setWrongAnswerRule: (wrongAnswerRule: ImplementedWrongAnswerRule) => void;
  setMissPenalty: (missPenalty: MissPenaltySetting) => void;
  setWinCondition: (winCondition: WinConditionSetting) => void;
  applyRuleSet: (ruleSet: RuleSet) => void;
  setUser: (user: { id: string; name: string; handle: string; role: UserRole }) => void;
  setGuest: () => void;
};

function clampCount(questionCount: number): number {
  return Math.min(
    MAX_QUESTIONS_PER_GAME,
    Math.max(MIN_QUESTIONS_PER_GAME, questionCount),
  );
}

export const useSession = create<SessionState>((set) => ({
  userId: null,
  displayName: "ゲスト",
  handle: "guest",
  role: "guest",
  questionCount: DEFAULT_RULE_SET.questionCount,
  genreFilter: DEFAULT_RULE_SET.genreFilter,
  showQuestionGenre: false,
  correctPoints: DEFAULT_RULE_SET.correctPoints,
  missPenalty: DEFAULT_RULE_SET.missPenalty,
  missPoints: DEFAULT_RULE_SET.missPoints,
  winCondition: DEFAULT_RULE_SET.winCondition,
  targetPoints: DEFAULT_RULE_SET.targetPoints,
  revealSpeed: DEFAULT_RULE_SET.revealSpeed,
  wrongAnswerRule: DEFAULT_RULE_SET.wrongAnswerRule,
  maxRereads: DEFAULT_RULE_SET.maxRereads,
  setDisplayName: (displayName) => set({ displayName }),
  setQuestionCount: (questionCount) =>
    set({
      questionCount: clampCount(questionCount),
    }),
  setGenreFilter: (genreFilter) => set({ genreFilter }),
  setShowQuestionGenre: (showQuestionGenre) => set({ showQuestionGenre }),
  setRevealSpeed: (revealSpeed) => set({ revealSpeed }),
  setWrongAnswerRule: (wrongAnswerRule) => set({ wrongAnswerRule }),
  setMissPenalty: (missPenalty) => set({ missPenalty }),
  setWinCondition: (winCondition) => set({ winCondition }),
  applyRuleSet: (ruleSet) =>
    set({
      questionCount: clampCount(ruleSet.questionCount),
      genreFilter: ruleSet.genreFilter,
      correctPoints: ruleSet.correctPoints,
      missPenalty: ruleSet.missPenalty,
      missPoints: ruleSet.missPoints,
      winCondition: ruleSet.winCondition,
      targetPoints: ruleSet.targetPoints,
      revealSpeed: ruleSet.revealSpeed,
      wrongAnswerRule: ruleSet.wrongAnswerRule,
      maxRereads: ruleSet.maxRereads,
    }),
  setUser: (user) =>
    set({
      userId: user.id,
      displayName: user.name,
      handle: user.handle,
      role: user.role === "admin" ? "admin" : "user",
    }),
  setGuest: () =>
    set({
      userId: null,
      displayName: "ゲスト",
      handle: "guest",
      role: "guest",
    }),
}));
