import type { PlayerIntent, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";
import type { SessionAnalysis } from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";
import { gameViewFromPublic } from "../../game/public-view-map.ts";
import { PlayScreen } from "./PlayScreen.tsx";

type Props = {
  playerId: string;
  view: PublicGameView;
  sendIntent: (intent: PlayerIntent) => void;
  genres: Genre[];
  onExit: () => void;
  ended?: boolean;
  records?: QuestionPlayRecord[];
  analysis?: SessionAnalysis | null;
  saveError?: string | null;
};

export function VersusPlayContainer({
  playerId,
  view,
  sendIntent,
  genres,
  onExit,
  ended = false,
  records = [],
  analysis = null,
  saveError = null,
}: Props) {
  const mapped = gameViewFromPublic(ended ? { ...view, phase: "gameOver" } : view, records);
  return (
    <PlayScreen
      playerId={playerId}
      view={mapped}
      sendIntent={sendIntent}
      analysis={analysis}
      saveError={saveError}
      genres={genres}
      showQuestionGenre={false}
      onExit={onExit}
      mode="versus"
    />
  );
}
