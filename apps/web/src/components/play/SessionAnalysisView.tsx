import type { Genre } from "@qwyzm/shared";
import {
  describeGrowth,
  describeQuestionBuzz,
  NO_QUESTION_BUZZ_AVERAGE_MESSAGE,
  type SessionAnalysis,
  type StoredAttempt,
} from "@qwyzm/play-data";

const RESULT_LABEL = {
  correct: "正解",
  incorrect: "不正解",
  unanswered: "誰も押さず",
} as const;

export function formatAccuracy(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${(Math.round(value * 1000) / 10).toFixed(1)}%`;
}

export function formatMs(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${Math.round(value)}ms`;
}

export function formatBuzzChars(value: number | null): string {
  if (value === null) {
    return "—";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}文字` : `${rounded.toFixed(1)}文字`;
}

export function formatGenreLabels(genreIds: string[], genres: Genre[]): string {
  const byId = new Map(genres.map((genre) => [genre.id, genre]));
  return genreIds
    .map((id) => byId.get(id))
    .filter((genre): genre is Genre => genre !== undefined)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((genre) => genre.name)
    .join(" / ");
}

type Props = {
  score: number;
  rank?: number;
  analysis: SessionAnalysis | null;
  attempts: readonly StoredAttempt[];
  genres: Genre[];
  saveError?: string | null;
  heading?: string;
  kicker?: string;
  onBack: () => void;
  backLabel?: string;
};

export function SessionAnalysisView({
  score,
  rank,
  analysis,
  attempts,
  genres,
  saveError = null,
  heading = "終了",
  kicker = "RESULT",
  onBack,
  backLabel = "戻る",
}: Props) {
  const growth = analysis ? describeGrowth(analysis.growth) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <header>
        <p className="text-[11px] tracking-[0.4em] text-gold">{kicker}</p>
        <h1 className="mt-2 font-serif text-4xl">{heading}</h1>
        <p className="mt-2 text-muted">
          {rank !== undefined ? `${rank}位 / ` : null}
          {score}点
        </p>
      </header>

      {saveError ? <p className="text-sm text-bad">{saveError}</p> : null}

      <section className="space-y-2">
        <h2 className="text-[11px] tracking-[0.25em] text-muted">成績</h2>
        {analysis ? (
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <li>正解率 {formatAccuracy(analysis.current.accuracy)}</li>
            <li>平均回答時間 {formatMs(analysis.current.averageAnswerSubmitMs)}</li>
            <li>正解 {analysis.current.correctCount}</li>
            <li>不正解 {analysis.current.incorrectCount}</li>
          </ul>
        ) : (
          <p className="text-sm text-muted">集計中…</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] tracking-[0.25em] text-muted">成長</h2>
        {growth ? (
          <ul className="space-y-1 text-sm">
            <li>{growth.accuracy}</li>
            <li>{growth.answerSubmitMs}</li>
          </ul>
        ) : (
          <p className="text-sm text-muted">集計中…</p>
        )}
      </section>

      {analysis && analysis.byGenre.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[11px] tracking-[0.25em] text-muted">ジャンル別</h2>
          <ul className="space-y-2 text-sm">
            {analysis.byGenre.map((item) => (
              <li key={item.genreId}>
                <p>{item.name}</p>
                <p className="text-muted">
                  正解率 {formatAccuracy(item.stats.accuracy)} / 正解{" "}
                  {item.stats.correctCount} / 不正解 {item.stats.incorrectCount} /
                  平均回答時間 {formatMs(item.stats.averageAnswerSubmitMs)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="text-[11px] tracking-[0.25em] text-muted">問題別</h2>
        <ul className="min-h-0 flex-1 space-y-4 overflow-auto pr-2">
          {attempts.map((record) => {
            const buzz = analysis?.byQuestion.find(
              (item) =>
                item.questionId === record.questionId &&
                item.questionIndex === record.questionIndex,
            );
            const genreLabel = formatGenreLabels(record.genreIds, genres);
            return (
              <li
                key={`${record.questionId}-${record.questionIndex}`}
                className="border-b border-line pb-3"
              >
                <p className="text-[11px] text-muted">
                  第{record.questionIndex + 1}問
                  {genreLabel ? ` · ${genreLabel}` : ""}
                </p>
                <p className="mt-1 font-serif text-lg">{record.questionBody}</p>
                <p
                  className={`mt-2 text-sm ${record.result === "correct" ? "text-ok" : record.result === "incorrect" ? "text-bad" : "text-gold"}`}
                >
                  {RESULT_LABEL[record.result]}
                </p>
                <p className="mt-1 text-sm text-gold">正解 {record.answerReveal}</p>
                {record.answerRaw ? (
                  <p className="text-sm text-paper">あなたの解答 {record.answerRaw}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted">
                  早押し {record.buzzTimeMs !== null ? `${record.buzzTimeMs.toFixed(0)}ms` : "—"}
                  {" / "}
                  押下位置 {formatBuzzChars(record.buzzCharIndex)}
                </p>
                <p className="text-[11px] text-muted">
                  回答時間{" "}
                  {record.answerSubmitMs !== null
                    ? `${record.answerSubmitMs.toFixed(0)}ms`
                    : "—"}
                </p>
                {buzz === undefined ? (
                  <p className="text-[11px] text-muted">集計中…</p>
                ) : buzz.previousAverage === null ? (
                  <p className="text-[11px] text-muted">
                    {NO_QUESTION_BUZZ_AVERAGE_MESSAGE}
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-muted">
                      過去平均 {formatBuzzChars(buzz.previousAverage)}
                    </p>
                    {buzz.delta !== null ? (
                      <p className="text-[11px] text-gold">{describeQuestionBuzz(buzz)}</p>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <button
        type="button"
        onClick={onBack}
        className="self-start border border-line px-6 py-2 text-sm tracking-widest"
      >
        {backLabel}
      </button>
    </div>
  );
}
