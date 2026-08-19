import { useEffect, useMemo, useRef, useState } from "react";
import type { GameView } from "@qwyzm/game-core";
import type { Genre } from "@qwyzm/shared";
import {
  analyzeSession,
  createStoredGame,
  type PlayRepository,
  type SessionAnalysis,
  type StoredGame,
} from "@qwyzm/play-data";
import { createBrowserPlayRepository } from "./browser-repository.ts";
import { createHttpPlayRepository } from "./http-play-repository.ts";

export function useSoloResult(input: {
  gameId: string | null;
  startedAt: string | null;
  selectedGenreIds: string[];
  genres: Genre[];
  userId: string | null;
  view: GameView | null;
}): SessionAnalysis | null {
  const repo = useMemo<PlayRepository>(
    () =>
      input.userId === null
        ? createBrowserPlayRepository()
        : createHttpPlayRepository({ baseUrl: "/api" }),
    [input.userId],
  );
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const phase = input.view?.phase ?? null;
  const selectedKey = input.selectedGenreIds.join(",");
  const viewRef = useRef(input.view);
  const genresRef = useRef(input.genres);
  const selectedRef = useRef(input.selectedGenreIds);
  viewRef.current = input.view;
  genresRef.current = input.genres;
  selectedRef.current = input.selectedGenreIds;

  useEffect(() => {
    setAnalysis(null);
  }, [input.gameId]);

  useEffect(() => {
    if (input.gameId === null || input.startedAt === null || phase !== "gameOver") {
      return;
    }
    const view = viewRef.current;
    if (view === null) {
      return;
    }

    const gameId = input.gameId;
    const startedAt = input.startedAt;
    const stored = createStoredGame({
      id: gameId,
      startedAt,
      selectedGenreIds: [...selectedRef.current],
      score: view.players[0]?.score ?? 0,
      records: view.playRecords,
    });
    const genres = genresRef.current;
    setAnalysis(
      analyzeSession({
        currentAttempts: stored.attempts,
        previousGames: [],
        genres,
      }),
    );

    let cancelled = false;
    void (async () => {
      let previous: StoredGame[] = [];
      try {
        previous = (await repo.listGames()).filter((game) => game.id !== gameId);
      } catch {
        previous = [];
      }
      const next = analyzeSession({
        currentAttempts: stored.attempts,
        previousGames: previous,
        genres,
      });
      try {
        await repo.saveGame(stored);
      } catch {
        // Current-session analysis still shows; persistence can retry next time.
      }
      if (!cancelled) {
        setAnalysis(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.gameId, input.startedAt, phase, repo, selectedKey]);

  return analysis;
}
