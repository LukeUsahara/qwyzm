import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerIntent, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";
import type { Genre, RoomSnapshot, RuleSet } from "@qwyzm/shared";
import {
  createRoomConnection,
  probeOffset,
  rememberReconnect,
  rememberedReconnect,
  roomRuleSet,
  type SignalingEvent,
} from "../../rooms/connection.ts";
import { VersusPlayContainer } from "../play/VersusPlayContainer.tsx";

type Props = {
  displayName: string;
  ruleSet: RuleSet;
  genres: Genre[];
  onClose: () => void;
};

export function RoomScreen({ displayName, ruleSet, genres, onClose }: Props) {
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [matchView, setMatchView] = useState<PublicGameView | null>(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [records, setRecords] = useState<QuestionPlayRecord[]>([]);
  const conn = useRef<ReturnType<typeof createRoomConnection> | null>(null);
  const offsetRef = useRef(0);
  const seqRef = useRef(0);
  const inputRef = useRef("");
  const roomRef = useRef<RoomSnapshot | null>(null);
  const tokenRef = useRef<string | null>(null);
  const resumedRef = useRef(false);
  const playableRules = useMemo(() => roomRuleSet(ruleSet), [ruleSet]);

  useEffect(() => {
    let stopped = false;
    const handleEvent = (
      event: SignalingEvent,
      connection: ReturnType<typeof createRoomConnection>,
    ) => {
      if (event.type === "welcome") {
        setRoom(event.room);
        roomRef.current = event.room;
        setPlayerId(event.playerId);
        rememberReconnect(event.room.code, event.reconnectToken);
        tokenRef.current = event.reconnectToken;
        setError(null);
        connection.send({ type: "ping", t0: Date.now() });
        return;
      }
      if (event.type === "room") {
        setRoom(event.room);
        roomRef.current = event.room;
        return;
      }
      if (event.type === "pong") {
        const next = probeOffset(event.t0, event.t1, event.t2);
        offsetRef.current = next;
        setOffsetMs(next);
        return;
      }
      if (event.type === "kicked") {
        setRoom(null);
        roomRef.current = null;
        setPlayerId(null);
        setMatchView(null);
        setError("ホストに退出させられました");
        return;
      }
      if (event.type === "match_start") {
        setMatchEnded(false);
        setRecords([]);
        return;
      }
      if (event.type === "state") {
        setMatchView(event.view);
        inputRef.current = event.view.myAnswerInput;
        return;
      }
      if (event.type === "match_end") {
        setMatchEnded(true);
        setRecords(event.myRecords);
        return;
      }
      if (event.type === "error") {
        setError(event.code);
      }
    };
    const connect = (resume?: { roomCode: string; reconnectToken: string }) => {
      const connection = createRoomConnection({
        onEvent: (event) => handleEvent(event, connection),
        onClose: () => {
          if (stopped) {
            return;
          }
          const current = roomRef.current;
          const token = tokenRef.current;
          if (
            !resumedRef.current &&
            current &&
            token &&
            (current.status === "in_game" || current.status === "starting")
          ) {
            resumedRef.current = true;
            connect({ roomCode: current.code, reconnectToken: token });
            return;
          }
          setError((currentError) => currentError ?? "接続が切れました");
        },
      });
      conn.current = connection;
      if (resume) {
        connection.send({
          type: "resume",
          roomCode: resume.roomCode,
          reconnectToken: resume.reconnectToken,
        });
      }
    };
    connect();
    return () => {
      stopped = true;
      conn.current?.close();
    };
  }, []);

  useEffect(() => {
    if (room === null) {
      return;
    }
    const id = window.setInterval(() => {
      conn.current?.send({ type: "ping", t0: Date.now() });
    }, 2000);
    return () => window.clearInterval(id);
  }, [room]);

  const sendIntent = (intent: PlayerIntent) => {
    const clientTime = Date.now() + offsetRef.current;
    if (intent.type === "BUZZ") {
      seqRef.current += 1;
      conn.current?.send({ type: "buzz", clientTime, seq: seqRef.current });
      return;
    }
    if (intent.type === "ANSWER_START") {
      conn.current?.send({ type: "answer_start", clientTime });
      return;
    }
    if (intent.type === "ANSWER_INPUT") {
      inputRef.current = intent.value;
      conn.current?.send({ type: "answer_input", text: intent.value, clientTime });
      return;
    }
    conn.current?.send({ type: "answer_submit", text: inputRef.current, clientTime });
  };

  const host = playerId !== null && room?.hostPlayerId === playerId;

  if (playerId !== null && matchView !== null) {
    return (
      <VersusPlayContainer
        playerId={playerId}
        view={matchView}
        sendIntent={sendIntent}
        genres={genres}
        onExit={onClose}
        ended={matchEnded}
        records={records}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.4em] text-gold">CUSTOM ROOM</p>
          <h1 className="mt-2 font-serif text-4xl text-paper">カスタム部屋</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            部屋コードで招待し、2人以上で試合を始めます。
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
            {room.status === "starting"
              ? "問題を読み込んでいます"
              : room.status === "finished"
                ? "試合終了"
                : "ロビー"}
            {` / 時計補正 ${Math.round(offsetMs)}ms`}
          </p>
          <ul className="space-y-2">
            {room.players.map((player) => (
              <li key={player.id} className="flex items-center justify-between border border-line px-3 py-2 text-sm">
                <span className="text-paper">
                  {player.displayName}
                  {player.id === room.hostPlayerId ? "（ホスト）" : ""}
                  {player.connected ? "" : "（切断）"}
                </span>
                {host && player.id !== playerId && room.status === "lobby" ? (
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
