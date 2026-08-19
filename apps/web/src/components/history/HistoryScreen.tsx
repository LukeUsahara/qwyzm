import { useMemo, useState } from "react";
import {
  analyzeSession,
  summarizeAttempts,
  type StoredGame,
} from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";
import { SessionAnalysisView, formatAccuracy } from "../play/SessionAnalysisView.tsx";

type Props = {
  games: StoredGame[];
  loading: boolean;
  error: string | null;
  genres: Genre[];
  onClose: () => void;
};

function formatEndedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function HistoryScreen({ games, loading, error, genres, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = games.find((game) => game.id === selectedId) ?? null;
  const analysis = useMemo(() => {
    if (selected === null) {
      return null;
    }
    return analyzeSession({
      currentAttempts: selected.attempts,
      previousGames: games.filter((game) => game.id !== selected.id),
      genres,
    });
  }, [games, genres, selected]);

  if (selected !== null) {
    return (
      <SessionAnalysisView
        score={selected.score}
        analysis={analysis}
        attempts={selected.attempts}
        genres={genres}
        heading={formatEndedAt(selected.endedAt)}
        kicker="HISTORY"
        onBack={() => setSelectedId(null)}
        backLabel="一覧へ"
      />
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col gap-6">
      <header>
        <p className="text-[11px] tracking-[0.4em] text-gold">HISTORY</p>
        <h1 className="mt-2 font-serif text-4xl text-paper">履歴</h1>
        <p className="mt-3 text-sm text-muted">過去の一人練習を見返せます。</p>
      </header>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
      {loading && games.length === 0 ? (
        <p className="text-sm text-muted">読み込み中…</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-muted">まだ保存された練習がありません。</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {games.map((game) => {
            const stats = summarizeAttempts(game.attempts);
            return (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(game.id)}
                  className="w-full border border-line px-4 py-3 text-left hover:border-gold"
                >
                  <span className="block text-[11px] text-muted">
                    {formatEndedAt(game.endedAt)}
                  </span>
                  <span className="mt-1 block text-sm text-paper">
                    {game.score}点 / {game.questionCount}問 / 正解率{" "}
                    {formatAccuracy(stats.accuracy)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onClose}
        className="self-start border border-line px-6 py-2 text-sm tracking-widest"
      >
        戻る
      </button>
    </div>
  );
}
