import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot, RuleSet } from "@qwyzm/shared";
import {
  createRoomConnection,
  probeOffset,
  rememberReconnect,
  rememberedReconnect,
  roomRuleSet,
} from "../../rooms/connection.ts";

type Props = {
  displayName: string;
  ruleSet: RuleSet;
  onClose: () => void;
};

export function RoomScreen({ displayName, ruleSet, onClose }: Props) {
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  const conn = useRef<ReturnType<typeof createRoomConnection> | null>(null);
  const playableRules = useMemo(() => roomRuleSet(ruleSet), [ruleSet]);

  useEffect(() => {
    const connection = createRoomConnection({
      onEvent: (event) => {
        if (event.type === "welcome") {
          setRoom(event.room);
          setPlayerId(event.playerId);
          rememberReconnect(event.room.code, event.reconnectToken);
          setError(null);
          connection.send({ type: "ping", t0: Date.now() });
          return;
        }
        if (event.type === "room") {
          setRoom(event.room);
          return;
        }
        if (event.type === "pong") {
          setOffsetMs(probeOffset(event.t0, event.t1, event.t2));
          return;
        }
        if (event.type === "kicked") {
          setRoom(null);
          setPlayerId(null);
          setError("ホストに退出させられました");
          return;
        }
        if (event.type === "error") {
          setError(event.code);
        }
      },
      onClose: () => {
        setError((current) => current ?? "接続が切れました");
      },
    });
    conn.current = connection;
    return () => connection.close();
  }, []);

  const host = playerId !== null && room?.hostPlayerId === playerId;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.4em] text-gold">CUSTOM ROOM</p>
          <h1 className="mt-2 font-serif text-4xl text-paper">カスタム部屋</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            部屋コードで招待します。試合そのものは次の段階です。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
        >
          ホーム
        </button>
      </div>

      {room === null ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() =>
              conn.current?.send({
                type: "create",
                displayName,
                ruleSet: playableRules,
              })
            }
            className="self-start border border-gold px-8 py-3 text-sm tracking-[0.3em] text-gold"
          >
            部屋を作る
          </button>
          <label className="block space-y-2">
            <span className="text-[11px] tracking-widest text-muted">部屋コード</span>
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              conn.current?.send({
                type: "join",
                displayName,
                roomCode: codeInput.trim(),
                reconnectToken: rememberedReconnect(codeInput.trim()),
              })
            }
            className="self-start border border-line px-8 py-3 text-sm tracking-[0.3em] text-paper"
          >
            参加
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-paper">
            コード <span className="text-gold">{room.code}</span>
          </p>
          <p className="text-[11px] text-muted">
            {room.status === "starting" ? "開始直前です。試合ループは Phase 12 です。" : "ロビー"}
            {offsetMs !== null ? ` / 時計補正 ${Math.round(offsetMs)}ms` : ""}
          </p>
          <ul className="space-y-2">
            {room.players.map((player) => (
              <li key={player.id} className="flex items-center justify-between border border-line px-3 py-2 text-sm">
                <span className="text-paper">
                  {player.displayName}
                  {player.id === room.hostPlayerId ? "（ホスト）" : ""}
                  {player.connected ? "" : "（切断）"}
                </span>
                {host && player.id !== playerId ? (
                  <button
                    type="button"
                    onClick={() => conn.current?.send({ type: "kick", playerId: player.id })}
                    className="border border-line px-2 py-1 text-[11px] tracking-widest text-muted"
                  >
                    キック
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {host && room.status === "lobby" ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  conn.current?.send({ type: "update_rules", ruleSet: playableRules })
                }
                className="border border-line px-6 py-3 text-sm tracking-[0.3em] text-paper"
              >
                設定を反映
              </button>
              <button
                type="button"
                onClick={() => conn.current?.send({ type: "start" })}
                className="border border-gold px-8 py-3 text-sm tracking-[0.3em] text-gold"
              >
                開始
              </button>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}
