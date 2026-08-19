import type { GameView } from "@qwyzm/game-core";

export function PlayerList({ view }: { view: GameView }) {
  return (
    <ul className="space-y-2">
      {view.players.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between border-b border-line pb-2 text-sm"
        >
          <div>
            <p className="text-paper">{player.displayName}</p>
            <p className="text-[11px] text-muted">{player.rank}位</p>
          </div>
          <p className="font-serif text-2xl text-gold">{player.score}</p>
        </li>
      ))}
    </ul>
  );
}
