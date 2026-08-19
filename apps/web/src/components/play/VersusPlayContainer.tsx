import type { PlayerIntent, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";
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
};

export function VersusPlayContainer({
  playerId,
  view,
  sendIntent,
  genres,
  onExit,
  ended = false,
  records = [],
}: Props) {
  const mapped = gameViewFromPublic(ended ? { ...view, phase: "gameOver" } : view, records);
  return (
    <PlayScreen
      playerId={playerId}
      view={mapped}
      sendIntent={sendIntent}
      analysis={null}
      saveError={null}
      genres={genres}
      showQuestionGenre={false}
      onExit={onExit}
      mode="versus"
    />
  );
}
