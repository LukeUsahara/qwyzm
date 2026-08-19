import {
  GameEngine,
  createLocalSyncedClock,
  randomQuestionPickStrategy,
  ruleSetToEngineSettings,
} from "@qwyzm/game-core";
import { toPlayQuestion, type QuestionCatalogItem } from "@qwyzm/play-data";
import type { RuleSet } from "@qwyzm/shared";
import { LOCAL_PLAYER_ID } from "./ids.ts";

export function createSoloEngine(params: {
  displayName: string;
  ruleSet: RuleSet;
  pool: QuestionCatalogItem[];
  recentQuestionIds?: readonly string[];
}): GameEngine {
  const clock = createLocalSyncedClock();
  const engine = new GameEngine(clock);
  const questions = randomQuestionPickStrategy().pick(
    params.pool.map(toPlayQuestion),
    params.ruleSet.questionCount,
    Math.random,
    params.recentQuestionIds ?? [],
  );
  engine.start({
    settings: {
      ...ruleSetToEngineSettings(params.ruleSet),
      questionCount: questions.length,
    },
    players: [
      {
        id: LOCAL_PLAYER_ID,
        displayName: params.displayName,
        seatIndex: 0,
      },
    ],
    questions,
  });
  return engine;
}
