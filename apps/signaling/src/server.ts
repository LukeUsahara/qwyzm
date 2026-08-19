import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { PlayerConnection, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";
import type { RoomSnapshot } from "@qwyzm/shared";
import { clientRoomMessageSchema } from "@qwyzm/validation";
import { createMatchRunner, type MatchRunner } from "./match-runner.ts";
import { defaultPlayQuestionsLoader, type PlayQuestionsLoader } from "./questions-source.ts";
import { createRoomManager } from "./room-manager.ts";
import { medianRtt } from "./time-guard.ts";

type ServerMessage =
  | { type: "welcome"; playerId: string; reconnectToken: string; room: RoomSnapshot }
  | { type: "room"; room: RoomSnapshot }
  | { type: "pong"; t0: number; t1: number; t2: number }
  | { type: "error"; code: string }
  | { type: "kicked" }
  | {
      type: "match_start";
      matchId: string;
      startedAt: number;
      questionCount: number;
      settings: RoomSnapshot["ruleSet"];
      players: RoomSnapshot["players"];
    }
  | { type: "state"; serverTime: number; version: number; view: PublicGameView }
  | {
      type: "match_end";
      matchId: string;
      reason: "completed" | "opponents_left";
      standings: { id: string; displayName: string; score: number; rank: number }[];
      myRecords: QuestionPlayRecord[];
    }
  | { type: "player_connection"; playerId: string; connection: PlayerConnection };

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : "error";
}

export function createSignalingServer(options: { loadQuestions?: PlayQuestionsLoader } = {}) {
  const rooms = createRoomManager();
  const sockets = new Map<string, WebSocket>();
  const matches = new Map<string, MatchRunner>();
  const roomByPlayer = new Map<string, string>();
  const rtts = new Map<string, number[]>();
  const hits = new Map<string, number[]>();
  const loadQuestions = options.loadQuestions ?? defaultPlayQuestionsLoader();

  const socketForPlayer = (playerId: string): WebSocket | undefined => {
    for (const [socketId, socket] of sockets) {
      if (rooms.playerIdForSocket(socketId) === playerId) {
        return socket;
      }
    }
    return undefined;
  };

  const rateOk = (socketId: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(socketId) ?? []).filter((stamp) => now - stamp < 1000);
    if (recent.length >= 20) {
      hits.set(socketId, recent);
      return false;
    }
    recent.push(now);
    hits.set(socketId, recent);
    return true;
  };

  const broadcastRoom = (room: RoomSnapshot) => {
    for (const player of room.players) {
      const socket = socketForPlayer(player.id);
      if (socket) {
        send(socket, { type: "room", room });
      }
    }
  };

  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "qwyzm-signaling" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: httpServer });
  wss.on("connection", (socket) => {
    const socketId = crypto.randomUUID();
    sockets.set(socketId, socket);

    socket.on("message", (raw) => {
      if (!rateOk(socketId)) {
        send(socket, { type: "error", code: "rate_limited" });
        return;
      }
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(String(raw));
      } catch {
        send(socket, { type: "error", code: "invalid_json" });
        return;
      }
      const parsed = clientRoomMessageSchema.safeParse(parsedJson);
      if (!parsed.success) {
        send(socket, { type: "error", code: "invalid_message" });
        return;
      }
      const playerId = rooms.playerIdForSocket(socketId);
      const roomCode = playerId === undefined ? undefined : roomByPlayer.get(playerId);
      const match = roomCode === undefined ? undefined : matches.get(roomCode);
      try {
        switch (parsed.data.type) {
          case "create": {
            const joined = rooms.create(socketId, parsed.data.displayName, parsed.data.ruleSet);
            roomByPlayer.set(joined.player.id, joined.room.code);
            send(socket, {
              type: "welcome",
              playerId: joined.player.id,
              reconnectToken: joined.player.reconnectToken,
              room: joined.room,
            });
            break;
          }
          case "join":
          case "resume": {
            const joined = rooms.join(
              socketId,
              parsed.data.roomCode,
              parsed.data.type === "join" ? parsed.data.displayName : "player",
              parsed.data.reconnectToken,
            );
            roomByPlayer.set(joined.player.id, joined.room.code);
            send(socket, {
              type: "welcome",
              playerId: joined.player.id,
              reconnectToken: joined.player.reconnectToken,
              room: joined.room,
            });
            broadcastRoom(joined.room);
            matches.get(joined.room.code)?.resume(joined.player.id);
            break;
          }
          case "leave": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            if (match !== undefined) {
              match.disconnect(playerId);
              const kept = rooms.disconnect(socketId);
              if (kept) {
                broadcastRoom(kept);
              }
              break;
            }
            const room = rooms.leave(playerId);
            roomByPlayer.delete(playerId);
            if (room) {
              broadcastRoom(room);
            }
            break;
          }
          case "kick": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            const targetId = parsed.data.playerId;
            const targetSocket = socketForPlayer(targetId);
            const room = rooms.kick(playerId, targetId);
            if (targetSocket) {
              send(targetSocket, { type: "kicked" });
            }
            broadcastRoom(room);
            break;
          }
          case "update_rules": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            broadcastRoom(rooms.updateRules(playerId, parsed.data.ruleSet));
            break;
          }
          case "start": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            const started = rooms.start(playerId);
            broadcastRoom(started);
            void (async () => {
              try {
                const questions = await loadQuestions(started.ruleSet, started.code);
                const matchId = crypto.randomUUID();
                const runner = createMatchRunner({
                  matchId,
                  ruleSet: started.ruleSet,
                  questions,
                  players: started.players.map((player) => ({
                    id: player.id,
                    displayName: player.displayName,
                    seatIndex: player.seatIndex,
                  })),
                  emitState: (id, view) => {
                    const target = socketForPlayer(id);
                    if (target) {
                      send(target, {
                        type: "state",
                        serverTime: Date.now(),
                        version: view.version,
                        view,
                      });
                    }
                  },
                  emitConnection: (id, connection) => {
                    for (const player of started.players) {
                      const target = socketForPlayer(player.id);
                      if (target) {
                        send(target, { type: "player_connection", playerId: id, connection });
                      }
                    }
                  },
                  onEnd: (payload) => {
                    rooms.setStatus(started.code, "finished");
                    const room = rooms.snapshotByCode(started.code);
                    for (const player of room?.players ?? []) {
                      const target = socketForPlayer(player.id);
                      if (target) {
                        send(target, {
                          type: "match_end",
                          matchId,
                          reason: payload.reason,
                          standings: payload.standings,
                          myRecords: payload.records.filter((record) => record.playerId === player.id),
                        });
                        if (room) {
                          send(target, { type: "room", room });
                        }
                      }
                    }
                    matches.delete(started.code);
                  },
                });
                matches.set(started.code, runner);
                rooms.setStatus(started.code, "in_game");
                const room = rooms.snapshotByCode(started.code) ?? started;
                for (const player of started.players) {
                  const target = socketForPlayer(player.id);
                  if (target) {
                    send(target, {
                      type: "match_start",
                      matchId,
                      startedAt: Date.now(),
                      questionCount: questions.length,
                      settings: started.ruleSet,
                      players: started.players,
                    });
                    send(target, { type: "room", room });
                  }
                }
                runner.start();
              } catch {
                rooms.revertToLobby(started.code);
                const room = rooms.snapshotByCode(started.code);
                if (room) {
                  for (const player of room.players) {
                    const target = socketForPlayer(player.id);
                    if (target) {
                      send(target, { type: "error", code: "questions_unavailable" });
                      send(target, { type: "room", room });
                    }
                  }
                }
              }
            })();
            break;
          }
          case "ping": {
            const t1 = Date.now();
            const sample = Math.max(0, t1 - parsed.data.t0);
            const list = [...(rtts.get(socketId) ?? []), sample].slice(-3);
            rtts.set(socketId, list);
            send(socket, { type: "pong", t0: parsed.data.t0, t1, t2: Date.now() });
            break;
          }
          case "buzz": {
            if (playerId === undefined || match === undefined) {
              throw new Error("not_in_room");
            }
            const code = match.buzz(playerId, parsed.data.clientTime, medianRtt(rtts.get(socketId) ?? []));
            if (code) {
              send(socket, { type: "error", code });
            }
            break;
          }
          case "answer_start": {
            if (playerId === undefined || match === undefined) {
              throw new Error("not_in_room");
            }
            const code = match.intent(playerId, { type: "ANSWER_START" }, parsed.data.clientTime);
            if (code) {
              send(socket, { type: "error", code });
            }
            break;
          }
          case "answer_input": {
            if (playerId === undefined || match === undefined) {
              throw new Error("not_in_room");
            }
            const code = match.intent(
              playerId,
              { type: "ANSWER_INPUT", value: parsed.data.text },
              parsed.data.clientTime,
            );
            if (code) {
              send(socket, { type: "error", code });
            }
            break;
          }
          case "answer_submit": {
            if (playerId === undefined || match === undefined) {
              throw new Error("not_in_room");
            }
            const code = match.intent(
              playerId,
              { type: "ANSWER_INPUT", value: parsed.data.text },
              parsed.data.clientTime,
            );
            const submit = match.intent(playerId, { type: "ANSWER_SUBMIT" }, parsed.data.clientTime);
            if (code ?? submit) {
              send(socket, { type: "error", code: code ?? submit ?? "error" });
            }
            break;
          }
        }
      } catch (error) {
        send(socket, { type: "error", code: errorCode(error) });
      }
    });

    socket.on("close", () => {
      const playerId = rooms.playerIdForSocket(socketId);
      const room = rooms.disconnect(socketId);
      sockets.delete(socketId);
      if (playerId && room) {
        matches.get(room.code)?.disconnect(playerId);
        broadcastRoom(room);
      }
    });
  });

  return { httpServer, rooms };
}
