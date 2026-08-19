import type { GameView } from "@qwyzm/game-core";
import type { Genre } from "@qwyzm/shared";
import type { SessionAnalysis } from "@qwyzm/play-data";
import { LOCAL_PLAYER_ID } from "../game/ids.ts";
import { useSavePlay } from "./useSavePlay.ts";

export function useSoloResult(input: {
  gameId: string | null;
  startedAt: string | null;
  selectedGenreIds: string[];
  genres: Genre[];
  userId: string | null;
  view: GameView | null;
  onSaved?: () => void;
}): {
  analysis: SessionAnalysis | null;
  saveError: string | null;
} {
  const view = input.view;
  const self = view?.players.find((player) => player.id === LOCAL_PLAYER_ID) ?? view?.players[0];
  return useSavePlay({
    gameId: input.gameId,
    startedAt: input.startedAt,
    selectedGenreIds: input.selectedGenreIds,
    genres: input.genres,
    userId: input.userId,
    mode: "solo",
    score: self?.score ?? 0,
    rank: self?.rank ?? null,
    seatIndex: self?.seatIndex ?? 0,
    records: view?.playRecords ?? [],
    active: view?.phase === "gameOver",
    onSaved: input.onSaved,
  });
}
