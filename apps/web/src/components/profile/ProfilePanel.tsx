import { AuthPanel } from "./AuthPanel.tsx";
import { formatAccuracy } from "../play/SessionAnalysisView.tsx";
import type { GenreStats } from "@qwyzm/play-data";
import { USER_ROLE_LABEL, type UserRole } from "@qwyzm/shared";

type Props = {
  displayName: string;
  handle: string;
  role: UserRole;
  genreStats: GenreStats[];
  onOpenHome: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
};

export function ProfilePanel({
  displayName,
  handle,
  role,
  genreStats,
  onOpenHome,
  onOpenHistory,
  onOpenSettings,
  onOpenAdmin,
}: Props) {
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
        <GenreRadar stats={genreStats} />
      </section>

      <section>
        <h2 className="mb-3 text-[11px] tracking-[0.25em] text-muted">移動</h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpenHome}
            className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
          >
            ホーム
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
          >
            履歴
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
          >
            設定
          </button>
        </div>
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

function GenreRadar({ stats }: { stats: GenreStats[] }) {
  const cx = 90;
  const cy = 90;
  const r = 62;
    const count = stats.length;
  const ring = stats.length === 0
    ? []
    : stats.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      });
  const plot =
    stats.length === 0
      ? ""
      : stats
          .map((item, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
            const ratio = item.stats.accuracy ?? 0;
            return `${cx + r * ratio * Math.cos(angle)},${cy + r * ratio * Math.sin(angle)}`;
          })
          .join(" ");

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 180 180" className="w-full text-muted">
        {ring.length > 0 ? (
          <polygon points={ring.join(" ")} fill="none" stroke="currentColor" strokeOpacity="0.35" />
        ) : null}
        {plot.length > 0 ? (
          <polygon points={plot} fill="#c6a15b" fillOpacity="0.25" stroke="#c6a15b" />
        ) : null}
        {stats.map((item, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          const x = cx + (r + 16) * Math.cos(angle);
          const y = cy + (r + 16) * Math.sin(angle);
          return (
            <text
              key={item.genreId}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              fontSize="9"
            >
              {item.name}
            </text>
          );
        })}
      </svg>
      <ul className="space-y-1 text-[11px] text-muted">
        {stats.map((item) => (
          <li key={item.genreId} className="flex justify-between gap-2">
            <span>{item.name}</span>
            <span>{formatAccuracy(item.stats.accuracy)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
