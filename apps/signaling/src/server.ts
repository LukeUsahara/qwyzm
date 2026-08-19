import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { clientRoomMessageSchema } from "@qwyzm/validation";
import { createRoomManager } from "./room-manager.ts";
import type { RoomSnapshot } from "@qwyzm/shared";

type ServerMessage =
  | { type: "welcome"; playerId: string; reconnectToken: string; room: RoomSnapshot }
  | { type: "room"; room: RoomSnapshot }
  | { type: "pong"; t0: number; t1: number; t2: number }
  | { type: "error"; code: string }
  | { type: "kicked" };

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : "error";
}

export function createSignalingServer() {
  const rooms = createRoomManager();
  const sockets = new Map<string, WebSocket>();

  const socketForPlayer = (playerId: string): WebSocket | undefined => {
    for (const [socketId, socket] of sockets) {
      if (rooms.playerIdForSocket(socketId) === playerId) {
        return socket;
      }
    }
    return undefined;
  };

  const broadcast = (room: RoomSnapshot) => {
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
      try {
        switch (parsed.data.type) {
          case "create": {
            const joined = rooms.create(socketId, parsed.data.displayName, parsed.data.ruleSet);
            send(socket, {
              type: "welcome",
              playerId: joined.player.id,
              reconnectToken: joined.player.reconnectToken,
              room: joined.room,
            });
            break;
          }
          case "join": {
            const joined = rooms.join(
              socketId,
              parsed.data.roomCode,
              parsed.data.displayName,
              parsed.data.reconnectToken,
            );
            send(socket, {
              type: "welcome",
              playerId: joined.player.id,
              reconnectToken: joined.player.reconnectToken,
              room: joined.room,
            });
            broadcast(joined.room);
            break;
          }
          case "leave": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            const room = rooms.leave(playerId);
            if (room) {
              broadcast(room);
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
            broadcast(room);
            break;
          }
          case "update_rules": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            broadcast(rooms.updateRules(playerId, parsed.data.ruleSet));
            break;
          }
          case "start": {
            if (playerId === undefined) {
              throw new Error("not_in_room");
            }
            broadcast(rooms.start(playerId));
            break;
          }
          case "ping": {
            const t1 = Date.now();
            send(socket, { type: "pong", t0: parsed.data.t0, t1, t2: Date.now() });
            break;
          }
        }
      } catch (error) {
        send(socket, { type: "error", code: errorCode(error) });
      }
    });

    socket.on("close", () => {
      const room = rooms.disconnect(socketId);
      sockets.delete(socketId);
      if (room) {
        broadcast(room);
      }
    });
  });

  return { httpServer, rooms };
}
