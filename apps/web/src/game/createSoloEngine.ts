import {
  GameEngine,
  SOLO_DEFAULT_SETTINGS,
  createLocalSyncedClock,
  filterQuestionsByGenres,
  randomQuestionPickStrategy,
} from "@qwyzm/game-core";
import { toPlayQuestion, type QuestionCatalogItem } from "@qwyzm/play-data";
import type { Genre, GenrePlayFilter } from "@qwyzm/shared";
import { LOCAL_PLAYER_ID } from "./ids.ts";

export function createSoloEngine(params: {
  displayName: string;
  questionCount: number;
  pool: QuestionCatalogItem[];
  genres: Genre[];
  genreFilter: GenrePlayFilter;
}): GameEngine {
  const clock = createLocalSyncedClock();
  const engine = new GameEngine(clock);
  const filtered = filterQuestionsByGenres(
    params.pool.map(toPlayQuestion),
    params.genres,
    params.genreFilter,
  );
  const questions = randomQuestionPickStrategy().pick(filtered, params.questionCount);
  engine.start({
    settings: {
      ...SOLO_DEFAULT_SETTINGS,
      questionCount: questions.length,
      wrongAnswerRule: "end_question",
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
