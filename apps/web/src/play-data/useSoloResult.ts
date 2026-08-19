import { useEffect, useMemo, useRef, useState } from "react";
import type { GameView } from "@qwyzm/game-core";
import type { Genre } from "@qwyzm/shared";
import {
  analyzeSession,
  createStoredGame,
  type SessionAnalysis,
  type StoredGame,
} from "@qwyzm/play-data";
import { createClientPlayRepository } from "./client-play-repository.ts";

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
  const repo = useMemo(
    () => createClientPlayRepository(input.userId),
    [input.userId],
  );
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const phase = input.view?.phase ?? null;
  const selectedKey = input.selectedGenreIds.join(",");
  const viewRef = useRef(input.view);
  const genresRef = useRef(input.genres);
  const selectedRef = useRef(input.selectedGenreIds);
  const onSavedRef = useRef(input.onSaved);
  viewRef.current = input.view;
  genresRef.current = input.genres;
  selectedRef.current = input.selectedGenreIds;
  onSavedRef.current = input.onSaved;

  useEffect(() => {
    setAnalysis(null);
    setSaveError(null);
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
    setSaveError(null);

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
        if (!cancelled) {
          setSaveError(null);
          onSavedRef.current?.();
        }
      } catch {
        if (!cancelled) {
          setSaveError(
            input.userId === null
              ? "このブラウザへの保存に失敗しました"
              : "サーバーへの保存に失敗しました。成績はこの画面では見られますが、履歴には残っていない可能性があります。",
          );
        }
      }
      if (!cancelled) {
        setAnalysis(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.gameId, input.startedAt, phase, repo, selectedKey, input.userId]);

  return { analysis, saveError };
}
