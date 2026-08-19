import type { GaugeView } from "@qwyzm/game-core";

const SIZE = 72;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LABEL: Record<string, string> = {
  noBuzz: "早押し",
  answerStart: "入力",
  result: "次へ",
};

type Props = {
  gauge: GaugeView;
};

export function DiscTimer({ gauge }: Props) {
  const offset = CIRCUMFERENCE * (1 - gauge.ratio);
  const seconds = Math.max(0, gauge.remainingMs / 1000);
  const label = LABEL[gauge.kind] ?? "";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="text-gold"
        aria-label={`${label} 残り${seconds.toFixed(1)}秒`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize="18"
          fontFamily="IBM Plex Sans JP, sans-serif"
        >
          {seconds.toFixed(0)}
        </text>
      </svg>
      <span className="text-[10px] tracking-[0.2em] text-muted">{label}</span>
    </div>
  );
}
