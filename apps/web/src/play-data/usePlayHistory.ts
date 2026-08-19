import { useEffect, useMemo, useState } from "react";
import type { StoredGame } from "@qwyzm/play-data";
import { createClientPlayRepository } from "./client-play-repository.ts";

export function usePlayHistory(
  userId: string | null,
  reloadToken: number,
): {
  games: StoredGame[];
  loading: boolean;
  error: string | null;
} {
  const repo = useMemo(() => createClientPlayRepository(userId), [userId]);
  const [games, setGames] = useState<StoredGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const listed = await repo.listGames();
        if (cancelled) {
          return;
        }
        setGames([...listed].sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1)));
        setError(null);
      } catch {
        if (!cancelled) {
          setError("履歴を取得できませんでした");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, reloadToken]);

  return { games, loading, error };
}
