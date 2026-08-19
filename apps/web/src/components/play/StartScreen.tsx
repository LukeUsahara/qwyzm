import {
  DEFAULT_GENRE_PLAY_FILTER,
  MAX_QUESTIONS_PER_GAME,
  MIN_QUESTIONS_PER_GAME,
  childrenOf,
  mainGenres,
  mainSelectionState,
  toggleMainGenreSelection,
  uniqueGenres,
  type Genre,
  type GenrePlayFilter,
} from "@qwyzm/shared";
import { soloStartSchema } from "@qwyzm/validation";
import { type FormEvent, useEffect, useState } from "react";

const EMPTY_QUESTION_COUNT = 10;

type Props = {
  displayName: string;
  questionCount: number;
  genreFilter: GenrePlayFilter;
  genres: Genre[];
  poolSize: number;
  onDisplayName: (value: string) => void;
  onQuestionCount: (value: number) => void;
  onGenreFilter: (filter: GenrePlayFilter) => void;
  onStart: (questionCount: number) => void;
  busy?: boolean;
  authenticated?: boolean;
};

function genreButtonClass(state: "all" | "some" | "none"): string {
  if (state === "all") {
    return "border-gold text-gold";
  }
  if (state === "some") {
    return "border-gold/50 text-gold/80";
  }
  return "border-line text-muted";
}

function MainGenreTree({
  genres,
  filter,
  onToggle,
}: {
  genres: Genre[];
  filter: GenrePlayFilter;
  onToggle: (id: string) => void;
}) {
  const mains = mainGenres(genres);
  const roots = mains.filter((genre) => genre.parentId === null);

  const render = (genre: Genre, depth: number) => {
    const state = mainSelectionState(mains, filter, genre.id);
    const children = childrenOf(mains, genre.id);
    return (
      <div key={genre.id} className="space-y-1" style={{ marginLeft: depth === 0 ? 0 : 12 }}>
        <button
          type="button"
          onClick={() => onToggle(genre.id)}
          className={`border px-3 py-1.5 text-sm ${genreButtonClass(state)}`}
        >
          {genre.name}
        </button>
        {children.length > 0 ? (
          <div className="space-y-1">{children.map((child) => render(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return <div className="space-y-2">{roots.map((root) => render(root, 0))}</div>;
}

export function StartScreen({
  displayName,
  questionCount,
  genreFilter,
  genres,
  poolSize,
  onDisplayName,
  onQuestionCount,
  onGenreFilter,
  onStart,
  busy = false,
  authenticated = false,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [countText, setCountText] = useState(String(questionCount));
  const maxCount = Math.min(MAX_QUESTIONS_PER_GAME, Math.max(poolSize, 1));
  const uniques = uniqueGenres(genres);

  useEffect(() => {
    setCountText(String(questionCount));
  }, [questionCount]);

  const commitCount = (raw: string): number => {
    const parsed = raw.trim() === "" ? EMPTY_QUESTION_COUNT : Number(raw);
    const next = Number.isFinite(parsed)
      ? Math.min(maxCount, Math.max(MIN_QUESTIONS_PER_GAME, Math.trunc(parsed)))
      : Math.min(maxCount, EMPTY_QUESTION_COUNT);
    onQuestionCount(next);
    setCountText(String(next));
    return next;
  };

  const handleStart = (event: FormEvent) => {
    event.preventDefault();
    const count = commitCount(countText);
    const parsed = soloStartSchema.safeParse({
      displayName,
      questionCount: count,
      selectedGenreIds: genreFilter.allMain ? [] : [...genreFilter.selectedGenreIds],
    });
    if (!parsed.success) {
      setError("名前と問題数を確認してください");
      return;
    }
    if (poolSize < 1) {
      setError("このジャンルには問題がありません");
      return;
    }
    setError(null);
    onStart(count);
  };

  return (
    <form onSubmit={handleStart} className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <p className="text-[11px] tracking-[0.4em] text-gold">SOLO PRACTICE</p>
        <h1 className="mt-2 font-serif text-4xl text-paper">一人練習</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          早押し、文字送り、回答制限時間は本番と同じ規則です。
        </p>
      </div>

      {authenticated ? (
        <p className="text-sm text-muted">
          {displayName} として記録します。成績はこのアカウントに保存されます。
        </p>
      ) : (
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">表示名</span>
          <input
            value={displayName}
            onChange={(event) => onDisplayName(event.target.value)}
            className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
          />
          <p className="text-[11px] text-muted">
            未ログインの成績はこのブラウザにだけ残ります。
          </p>
        </label>
      )}

      <fieldset className="space-y-3">
        <legend className="text-[11px] tracking-widest text-muted">ジャンル</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={genreFilter.allMain}
            onChange={() =>
              onGenreFilter({
                ...genreFilter,
                allMain: !genreFilter.allMain,
                selectedGenreIds: [],
              })
            }
          />
          全て
        </label>
        <MainGenreTree
          genres={genres}
          filter={genreFilter}
          onToggle={(id) => {
            const next = toggleMainGenreSelection(genres, genreFilter, id);
            onGenreFilter({ ...genreFilter, ...next });
          }}
        />
        <p className="text-[11px] text-muted">
          括りを押すとその下すべてが入ります。全てから葉を押すと、そのジャンルだけ外れます。
        </p>
        <p className="text-[11px] text-muted">対象 {poolSize} 問</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] tracking-widest text-muted">ユニークジャンル</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={genreFilter.includeUnique}
            onChange={() =>
              onGenreFilter({
                ...genreFilter,
                includeUnique: !genreFilter.includeUnique,
                selectedUniqueGenreIds: genreFilter.includeUnique
                  ? []
                  : genreFilter.selectedUniqueGenreIds,
              })
            }
          />
          ユニークジャンルを含める
        </label>
        {genreFilter.includeUnique ? (
          <>
            <select
              multiple
              value={[...genreFilter.selectedUniqueGenreIds]}
              onChange={(event) => {
                const selected = [...event.target.selectedOptions].map((option) => option.value);
                onGenreFilter({
                  ...genreFilter,
                  selectedUniqueGenreIds: selected,
                });
              }}
              className="min-h-32 w-full border border-line bg-ink px-3 py-2 text-sm"
            >
              {uniques.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted">
              未選択なら、ユニークジャンルはすべて対象です。Ctrl や Cmd で複数選べます。
            </p>
          </>
        ) : null}
      </fieldset>

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">
          問題数（{MIN_QUESTIONS_PER_GAME}〜{maxCount}）
        </span>
        <input
          type="number"
          min={MIN_QUESTIONS_PER_GAME}
          max={maxCount}
          value={countText}
          onChange={(event) => setCountText(event.target.value)}
          onBlur={() => commitCount(countText)}
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        />
      </label>

      {error ? <p className="text-sm text-bad">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="self-start border border-gold px-8 py-3 text-sm tracking-[0.3em] text-gold disabled:opacity-50"
      >
        開始
      </button>
    </form>
  );
}

export const defaultStartGenreFilter = DEFAULT_GENRE_PLAY_FILTER;
