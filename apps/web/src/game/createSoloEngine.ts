import {
  GameEngine,
  createLocalSyncedClock,
  filterQuestionsByGenres,
  randomQuestionPickStrategy,
  ruleSetToEngineSettings,
} from "@qwyzm/game-core";
import { toPlayQuestion, type QuestionCatalogItem } from "@qwyzm/play-data";
import type { Genre, RuleSet } from "@qwyzm/shared";
import { LOCAL_PLAYER_ID } from "./ids.ts";

export function createSoloEngine(params: {
  displayName: string;
  ruleSet: RuleSet;
  pool: QuestionCatalogItem[];
  genres: Genre[];
  recentQuestionIds?: readonly string[];
}): GameEngine {
  const clock = createLocalSyncedClock();
  const engine = new GameEngine(clock);
  const filtered = filterQuestionsByGenres(
    params.pool.map(toPlayQuestion),
    params.genres,
    params.ruleSet.genreFilter,
  );
  const questions = randomQuestionPickStrategy().pick(
    filtered,
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
