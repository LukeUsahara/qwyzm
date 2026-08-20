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
  type Genre,
  type GenrePlayFilter,
  type ImplementedWrongAnswerRule,
  type MissPenaltySetting,
  type QuestionSet,
  type RevealSpeed,
  type WinConditionSetting,
} from "@qwyzm/shared";
import { soloStartSchema } from "@qwyzm/validation";
import { type FormEvent, useEffect, useState } from "react";
import { GenreFilterFields } from "./GenreFilterFields.tsx";

const EMPTY_QUESTION_COUNT = 10;

type Props = {
  displayName: string;
  questionCount: number;
  genreFilter: GenrePlayFilter;
  questionSetId: string | null;
  questionSets: QuestionSet[];
  genres: Genre[];
  poolSize: number;
  onDisplayName: (value: string) => void;
  onQuestionCount: (value: number) => void;
  onGenreFilter: (filter: GenrePlayFilter) => void;
  onQuestionSetId: (id: string | null) => void;
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

export function StartScreen({
  displayName,
  questionCount,
  genreFilter,
  questionSetId,
  questionSets,
  showQuestionGenre,
  genres,
  poolSize,
  onDisplayName,
  onQuestionCount,
  onGenreFilter,
  onQuestionSetId,
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
  const selectedSet = questionSets.find((set) => set.id === questionSetId) ?? null;

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
      setError("この条件では出題できる問題がありません。");
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

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">問題セット</span>
        <select
          value={questionSetId ?? ""}
          onChange={(event) =>
            onQuestionSetId(event.target.value.length === 0 ? null : event.target.value)
          }
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          <option value="" className="bg-panel text-paper">
            ジャンルで選ぶ
          </option>
          {questionSets.map((set) => (
            <option key={set.id} value={set.id} className="bg-panel text-paper">
              {set.visibility === "official" ? `公式 / ${set.name}` : set.name}
            </option>
          ))}
        </select>
      </label>

      {selectedSet === null ? (
        <GenreFilterFields genres={genres} filter={genreFilter} onChange={onGenreFilter} />
      ) : (
        <p className="text-sm text-muted">
          {selectedSet.source === "filter" ? "ジャンル指定のセット" : "問題を指定したセット"}を使います。
        </p>
      )}
      {poolSize < 1 ? (
        <p className="text-sm text-bad">この条件では出題できる問題がありません。</p>
      ) : (
        <p className="text-[11px] text-muted">対象 {poolSize} 問</p>
      )}

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
        disabled={busy || poolSize < 1}
        className="self-start border border-gold px-8 py-3 text-sm tracking-[0.3em] text-gold disabled:opacity-50"
      >
        開始
      </button>
    </form>
  );
}

export const defaultStartGenreFilter = DEFAULT_GENRE_PLAY_FILTER;
