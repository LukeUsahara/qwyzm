import { useEffect, useMemo, useRef, useState } from "react";
import type { QuestionPlayRecord } from "@qwyzm/game-core";
import type { Genre } from "@qwyzm/shared";
import {
  analyzeSession,
  createStoredGame,
  type SessionAnalysis,
  type StoredGame,
  type StoredGameMode,
} from "@qwyzm/play-data";
import { createClientPlayRepository } from "./client-play-repository.ts";

export function useSavePlay(input: {
  gameId: string | null;
  startedAt: string | null;
  selectedGenreIds: string[];
  genres: Genre[];
  userId: string | null;
  mode: StoredGameMode;
  score: number;
  rank: number | null;
  seatIndex: number;
  questionCount?: number;
  records: readonly QuestionPlayRecord[];
  active: boolean;
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
  const selectedKey = input.selectedGenreIds.join(",");
  const genresRef = useRef(input.genres);
  const selectedRef = useRef(input.selectedGenreIds);
  const onSavedRef = useRef(input.onSaved);
  const recordsRef = useRef(input.records);
  genresRef.current = input.genres;
  selectedRef.current = input.selectedGenreIds;
  onSavedRef.current = input.onSaved;
  recordsRef.current = input.records;

  useEffect(() => {
    setAnalysis(null);
    setSaveError(null);
  }, [input.gameId]);

  useEffect(() => {
    if (
      !input.active ||
      input.gameId === null ||
      input.startedAt === null ||
      recordsRef.current.length < 1
    ) {
      return;
    }
    const gameId = input.gameId;
    const stored = createStoredGame({
      id: gameId,
      mode: input.mode,
      startedAt: input.startedAt,
      selectedGenreIds: [...selectedRef.current],
      questionCount: input.questionCount,
      score: input.score,
      rank: input.rank,
      seatIndex: input.seatIndex,
      records: recordsRef.current,
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
  }, [
    input.active,
    input.gameId,
    input.startedAt,
    input.mode,
    input.score,
    input.rank,
    input.seatIndex,
    input.questionCount,
    repo,
    selectedKey,
    input.userId,
  ]);

  return { analysis, saveError };
}
