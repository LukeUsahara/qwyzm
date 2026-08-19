import { AuthPanel } from "./AuthPanel.tsx";
import { USER_ROLE_LABEL, type UserRole } from "@qwyzm/shared";

type Props = {
  displayName: string;
  handle: string;
  role: UserRole;
  onOpenAdmin?: () => void;
};

const RADAR_AXES = ["歴史", "科学", "語学", "芸能", "スポーツ", "雑学"];

export function ProfilePanel({ displayName, handle, role, onOpenAdmin }: Props) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 border-r border-line bg-panel px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel-2 font-serif text-xl text-gold">
          {displayName.slice(0, 1)}
        </div>
        <div>
          <p className="text-base text-paper">{displayName}</p>
          <p className="text-xs text-muted">ID {handle}</p>
          <p className="text-[11px] tracking-widest text-gold">{USER_ROLE_LABEL[role]}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[11px] tracking-[0.25em] text-muted">
          ジャンル別正解率
        </h2>
        <RadarPlaceholder />
      </section>

      <section>
        <h2 className="mb-3 text-[11px] tracking-[0.25em] text-muted">アカウント</h2>
        <AuthPanel />
        {role === "admin" && onOpenAdmin ? (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="mt-3 border border-gold px-3 py-1.5 text-xs tracking-widest text-gold"
          >
            公式問題を編集
          </button>
        ) : null}
      </section>

      <section className="flex-1">
        <h2 className="mb-3 text-[11px] tracking-[0.25em] text-muted">フレンド</h2>
        <p className="text-sm text-muted">まだいません</p>
      </section>
    </aside>
  );
}

function RadarPlaceholder() {
  const cx = 90;
  const cy = 90;
  const r = 62;
  const points = RADAR_AXES.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 180 180" className="w-full text-muted">
      <polygon
        points={points}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
      />
      {RADAR_AXES.map((label, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
        const x = cx + (r + 16) * Math.cos(angle);
        const y = cy + (r + 16) * Math.sin(angle);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            fontSize="9"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
