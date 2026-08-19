import type { GameView } from "@qwyzm/game-core";
import type { Genre } from "@qwyzm/shared";
import { formatGenreLabels } from "./SessionAnalysisView.tsx";

export function QuestionBoard({
  view,
  genres,
  showGenre,
}: {
  view: GameView;
  genres: Genre[];
  showGenre: boolean;
}) {
  if (view.phase === "preview") {
    const genreLabel = formatGenreLabels(view.genreIds, genres);
    return (
      <div className="space-y-3">
        <p className="font-serif text-5xl text-gold">第{view.questionNumber}問</p>
        {showGenre && genreLabel.length > 0 ? (
          <p className="text-sm tracking-widest text-muted">ジャンル：{genreLabel}</p>
        ) : null}
      </div>
    );
  }

  if (view.phase === "showingResult") {
    const tone =
      view.outcome === "correct"
        ? "text-ok"
        : view.outcome === "incorrect"
          ? "text-bad"
          : "text-gold";
    return (
      <div className="space-y-4">
        <p className={`text-sm tracking-[0.3em] ${tone}`}>{view.statusLabel}</p>
        <p className="font-serif text-2xl leading-relaxed text-paper">
          {view.visibleText}
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-muted">正解</p>
          {view.answerReveal ? (
            <p className="font-serif text-3xl text-gold">{view.answerReveal}</p>
          ) : null}
        </div>
        {view.submittedAnswer ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted">あなたの解答</p>
            <p className="font-serif text-2xl text-paper">{view.submittedAnswer}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (!view.questionTextVisible) {
    return (
      <p className="text-sm tracking-[0.4em] text-muted">{view.statusLabel}</p>
    );
  }

  return (
    <p className="font-serif text-3xl leading-relaxed tracking-wide text-paper">
      {view.visibleText}
      <span className="ml-0.5 inline-block h-7 w-0.5 translate-y-1 bg-gold" />
    </p>
  );
}
