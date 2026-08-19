import {
  DEFAULT_GENRE_PLAY_FILTER,
  IMPLEMENTED_WRONG_ANSWER_RULES,
  MAX_QUESTIONS_PER_GAME,
  MIN_QUESTIONS_PER_GAME,
  MISS_PENALTIES,
  MISS_PENALTY_LABEL,
  REVEAL_SPEEDS,
  REVEAL_SPEED_LABEL,
  WIN_CONDITIONS,
  WIN_CONDITION_LABEL,
  WRONG_ANSWER_RULE_LABEL,
  childrenOf,
  mainGenres,
  mainSelectionState,
  toggleMainGenreSelection,
  uniqueGenres,
  type Genre,
  type GenrePlayFilter,
  type ImplementedWrongAnswerRule,
  type MissPenaltySetting,
  type RevealSpeed,
  type WinConditionSetting,
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
  showQuestionGenre: boolean;
  onShowQuestionGenre: (value: boolean) => void;
  revealSpeed: RevealSpeed;
  onRevealSpeed: (value: RevealSpeed) => void;
  wrongAnswerRule: ImplementedWrongAnswerRule;
  onWrongAnswerRule: (value: ImplementedWrongAnswerRule) => void;
  missPenalty: MissPenaltySetting;
  onMissPenalty: (value: MissPenaltySetting) => void;
  winCondition: WinConditionSetting;
  onWinCondition: (value: WinConditionSetting) => void;
  onStart: (questionCount: number) => void;
  onBack?: () => void;
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
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggleOpen = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const render = (genre: Genre) => {
    const state = mainSelectionState(mains, filter, genre.id);
    const children = childrenOf(mains, genre.id);
    const open = openIds.has(genre.id);
    return (
      <div key={genre.id} className="space-y-2">
        <div className="flex items-stretch">
          {children.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? `${genre.name}を閉じる` : `${genre.name}を開く`}
              onClick={() => toggleOpen(genre.id)}
              className="border border-r-0 border-line px-2 text-xs text-muted"
            >
              {open ? "▼" : "▶"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onToggle(genre.id)}
            className={`border px-3 py-1.5 text-sm ${genreButtonClass(state)}`}
          >
            {genre.name}
          </button>
        </div>
        {children.length > 0 && open ? (
          <div className="ml-5 space-y-2 border-l border-line pl-3">
            {children.map((child) => render(child))}
          </div>
        ) : null}
      </div>
    );
  };

  return <div className="flex flex-col gap-2">{roots.map((root) => render(root))}</div>;
}

export function StartScreen({
  displayName,
  questionCount,
  genreFilter,
  showQuestionGenre,
  genres,
  poolSize,
  onDisplayName,
  onQuestionCount,
  onGenreFilter,
  onShowQuestionGenre,
  revealSpeed,
  onRevealSpeed,
  wrongAnswerRule,
  onWrongAnswerRule,
  missPenalty,
  onMissPenalty,
  winCondition,
  onWinCondition,
  onStart,
  onBack,
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
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.4em] text-gold">SOLO PRACTICE</p>
          <h1 className="mt-2 font-serif text-4xl text-paper">一人練習</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            早押し、文字送り、回答制限時間は本番と同じ規則です。
          </p>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
          >
            ホーム
          </button>
        ) : null}
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
          ▶ で下の分類を開きます。名前を押すとその括り（またはジャンル）の選択が切り替わります。
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
            <div className="flex flex-col gap-2">
              {uniques.map((genre) => {
                const allOn = genreFilter.selectedUniqueGenreIds.length === 0;
                const active = allOn || genreFilter.selectedUniqueGenreIds.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      const ids = uniques.map((item) => item.id);
                      const selected = new Set(
                        genreFilter.selectedUniqueGenreIds.length === 0
                          ? ids
                          : genreFilter.selectedUniqueGenreIds,
                      );
                      if (selected.has(genre.id)) {
                        selected.delete(genre.id);
                      } else {
                        selected.add(genre.id);
                      }
                      const next = ids.filter((id) => selected.has(id));
                      onGenreFilter({
                        ...genreFilter,
                        selectedUniqueGenreIds: next.length === ids.length ? [] : next,
                      });
                    }}
                    className={`self-start border px-3 py-1.5 text-sm ${
                      active ? "border-gold text-gold" : "border-line text-muted"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted">
              チェック直後はすべて対象です。名前を押すとそのユニークジャンルだけ外れます。
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showQuestionGenre}
          onChange={() => onShowQuestionGenre(!showQuestionGenre)}
        />
        問題番号の下にジャンルを表示する
      </label>

      <fieldset className="space-y-4">
        <legend className="text-[11px] tracking-widest text-muted">試合ルール</legend>
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">文字送り</span>
          <select
            value={revealSpeed}
            onChange={(event) => onRevealSpeed(event.target.value as RevealSpeed)}
            className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
          >
            {REVEAL_SPEEDS.map((speed) => (
              <option key={speed} value={speed} className="bg-panel text-paper">
                {REVEAL_SPEED_LABEL[speed]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">誤答</span>
          <select
            value={wrongAnswerRule}
            onChange={(event) =>
              onWrongAnswerRule(event.target.value as ImplementedWrongAnswerRule)
            }
            className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
          >
            {IMPLEMENTED_WRONG_ANSWER_RULES.map((rule) => (
              <option key={rule} value={rule} className="bg-panel text-paper">
                {WRONG_ANSWER_RULE_LABEL[rule]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">勝利条件</span>
          <select
            value={winCondition}
            onChange={(event) =>
              onWinCondition(event.target.value as WinConditionSetting)
            }
            className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
          >
            {WIN_CONDITIONS.map((condition) => (
              <option key={condition} value={condition} className="bg-panel text-paper">
                {WIN_CONDITION_LABEL[condition]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">誤答ペナルティ</span>
          <select
            value={missPenalty}
            onChange={(event) =>
              onMissPenalty(event.target.value as MissPenaltySetting)
            }
            className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
          >
            {MISS_PENALTIES.map((penalty) => (
              <option key={penalty} value={penalty} className="bg-panel text-paper">
                {MISS_PENALTY_LABEL[penalty]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-muted">
          既定値は設定画面に保存されます。ここでの変更はこの開始だけです。一人ではどの誤答ルールも、他者がいないため問題終了になります。
        </p>
      </fieldset>

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
