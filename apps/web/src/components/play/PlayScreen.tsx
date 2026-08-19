import type { GameView, PlayerIntent } from "@qwyzm/game-core";
import type { SessionAnalysis } from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";
import { useEffect } from "react";
import { useSettings } from "../../stores/settings.ts";
import { labelForKeyCode } from "@qwyzm/shared";
import { AnswerBar } from "./AnswerBar.tsx";
import { AnswerField } from "./AnswerField.tsx";
import { BuzzButton } from "./BuzzButton.tsx";
import { DiscTimer } from "./DiscTimer.tsx";
import { GameOverScreen } from "./GameOverScreen.tsx";
import { PlayerList } from "./PlayerList.tsx";
import { QuestionBoard } from "./QuestionBoard.tsx";

type Props = {
  playerId: string;
  view: GameView;
  sendIntent: (intent: PlayerIntent) => void;
  analysis: SessionAnalysis | null;
  saveError: string | null;
  genres: Genre[];
  showQuestionGenre: boolean;
  onExit: () => void;
  mode?: "solo" | "versus";
};

export function PlayScreen({
  playerId,
  view,
  sendIntent,
  analysis,
  saveError,
  genres,
  showQuestionGenre,
  onExit,
  mode = "solo",
}: Props) {
  const selfCanBuzz = view.canBuzz && !view.lockedPlayerIds.includes(playerId);
  const answerGauge = view.gauges.find((gauge) => gauge.kind === "answerSubmit");
  const discGauge = view.gauges.find(
    (gauge) =>
      gauge.kind === "answerStart" ||
      gauge.kind === "result" ||
      gauge.kind === "noBuzz",
  );

  const buzzCode = useSettings((s) => s.keyBind.buzzCode);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== buzzCode) {
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!selfCanBuzz) {
        return;
      }
      event.preventDefault();
      sendIntent({ type: "BUZZ" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [buzzCode, sendIntent, selfCanBuzz]);

  if (view.phase === "gameOver") {
    return (
      <GameOverScreen
        playerId={playerId}
        view={view}
        analysis={analysis}
        saveError={saveError}
        genres={genres}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="grid h-full grid-cols-[1fr_220px] gap-8">
      <div className="flex flex-col">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-muted">
              {mode === "versus" ? "QWYZM VERSUS" : "QWYZM SOLO"}
            </p>
            <p className="mt-1 font-serif text-xl">
              {view.questionNumber ?? "—"} / {view.questionCount}
            </p>
          </div>
          <p className="text-sm text-gold">{view.statusLabel}</p>
        </header>

        <div
          className={`relative flex min-h-48 flex-1 items-center border border-line bg-panel-2 px-8 py-10 ${discGauge ? "pr-28" : ""}`}
        >
          {discGauge ? (
            <div className="absolute right-4 top-4">
              <DiscTimer gauge={discGauge} />
            </div>
          ) : null}
          <QuestionBoard view={view} genres={genres} showGenre={showQuestionGenre} />
        </div>

        <div className="mt-6 space-y-5">
          {answerGauge ? <AnswerBar gauge={answerGauge} /> : null}
          <BuzzButton enabled={selfCanBuzz} onBuzz={() => sendIntent({ type: "BUZZ" })} />
          <AnswerField
            enabled={view.canAnswer}
            value={view.inputValue}
            prompt={view.prompt}
            onStart={() => sendIntent({ type: "ANSWER_START" })}
            onInput={(value) => sendIntent({ type: "ANSWER_INPUT", value })}
            onSubmit={() => sendIntent({ type: "ANSWER_SUBMIT" })}
          />
          <p className="text-center text-[11px] text-muted">
            早押し: {labelForKeyCode(buzzCode)} またはボタン
          </p>
        </div>
      </div>

      <aside className="border-l border-line pl-6">
        <h2 className="mb-4 text-[11px] tracking-[0.25em] text-muted">
          プレイヤー
        </h2>
        <PlayerList view={view} />
        {view.buzzes.length > 0 ? (
          <div className="mt-8 space-y-2">
            <h3 className="text-[11px] tracking-[0.25em] text-muted">早押し</h3>
            {view.buzzes.map((buzz) => (
              <p key={buzz.playerId} className="text-sm">
                {buzz.displayName}
                <span className="ml-2 text-gold">
                  {buzz.timeFromReadingMs.toFixed(0)}ms
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
