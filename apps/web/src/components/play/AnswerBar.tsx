import type { GaugeView } from "@qwyzm/game-core";

type Props = {
  gauge: GaugeView;
};

export function AnswerBar({ gauge }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] tracking-widest text-muted">
        <span>回答</span>
        <span>{(gauge.remainingMs / 1000).toFixed(1)}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full origin-left bg-gold"
          style={{ transform: `scaleX(${gauge.ratio})` }}
        />
      </div>
    </div>
  );
}
