import type { GameView } from "@qwyzm/game-core";
import { attemptsFromPlayRecords, type SessionAnalysis } from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";
import { SessionAnalysisView } from "./SessionAnalysisView.tsx";

type Props = {
  playerId: string;
  view: GameView;
  analysis: SessionAnalysis | null;
  saveError: string | null;
  genres: Genre[];
  onExit: () => void;
};

export function GameOverScreen({ playerId, view, analysis, saveError, genres, onExit }: Props) {
  const self = view.players.find((player) => player.id === playerId) ?? view.players[0];
  return (
    <SessionAnalysisView
      score={self?.score ?? 0}
      rank={self?.rank}
      analysis={analysis}
      attempts={attemptsFromPlayRecords(playerId, view.playRecords)}
      genres={genres}
      saveError={saveError}
      onBack={onExit}
    />
  );
}
