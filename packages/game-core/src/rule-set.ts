import type { RuleSet } from "@qwyzm/shared";
import type { GameSettings } from "./types.ts";

export function ruleSetToEngineSettings(ruleSet: RuleSet): GameSettings {
  return {
    questionCount: ruleSet.questionCount,
    correctPoints: ruleSet.correctPoints,
    missPenalty: ruleSet.missPenalty,
    missPoints: ruleSet.missPoints,
    winCondition: ruleSet.winCondition,
    targetPoints: ruleSet.targetPoints,
    revealSpeed: ruleSet.revealSpeed,
    wrongAnswerRule: ruleSet.wrongAnswerRule,
    maxRereads: ruleSet.maxRereads,
  };
}
