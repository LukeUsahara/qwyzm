import {
  MAX_PLAYERS,
  MIN_PLAYERS_VERSUS,
  type RoomSnapshot,
  type RoomStatus,
  type RuleSet,
} from "@qwyzm/shared";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, roomRuleSetSchema } from "@qwyzm/validation";

export type RoomPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  reconnectToken: string;
  connected: boolean;
};

export type JoinResult = {
  room: RoomSnapshot;
  player: RoomPlayer;
};

type InternalPlayer = RoomPlayer & { socketId: string };

type InternalRoom = {
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  ruleSet: RuleSet;
  players: InternalPlayer[];
};

function snapshot(room: InternalRoom): RoomSnapshot {
  return {
    code: room.code,
    hostPlayerId: room.hostPlayerId,
    status: room.status,
    ruleSet: room.ruleSet,
    players: room.players
      .map((player) => ({
        id: player.id,
        displayName: player.displayName,
        seatIndex: player.seatIndex,
        connected: player.connected,
      }))
      .sort((a, b) => a.seatIndex - b.seatIndex),
  };
}

function newCode(random: () => number, taken: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      const index = Math.floor(random() * ROOM_CODE_ALPHABET.length);
      code += ROOM_CODE_ALPHABET[index] ?? "A";
    }
    if (!taken.has(code)) {
      return code;
    }
  }
  throw new Error("failed to allocate room code");
}

function publicPlayer(player: InternalPlayer): RoomPlayer {
  return {
    id: player.id,
    displayName: player.displayName,
    seatIndex: player.seatIndex,
    reconnectToken: player.reconnectToken,
    connected: player.connected,
  };
}

export function createRoomManager(options: { random?: () => number } = {}) {
  const random = options.random ?? Math.random;
  const rooms = new Map<string, InternalRoom>();
  const byPlayer = new Map<string, string>();
  const bySocket = new Map<string, string>();

  const requireRoom = (playerId: string): InternalRoom => {
    const code = byPlayer.get(playerId);
    if (code === undefined) {
      throw new Error("not_in_room");
    }
    const room = rooms.get(code);
    if (room === undefined) {
      throw new Error("not_in_room");
    }
    return room;
  };

  const requireHost = (playerId: string): InternalRoom => {
    const room = requireRoom(playerId);
    if (room.hostPlayerId !== playerId) {
      throw new Error("forbidden");
    }
    return room;
  };

  const dropRoomIfEmpty = (room: InternalRoom) => {
    if (room.players.length === 0) {
      rooms.delete(room.code);
    }
  };

  const promoteHost = (room: InternalRoom) => {
    const next =
      room.players.find((player) => player.connected) ?? room.players[0];
    if (next !== undefined) {
      room.hostPlayerId = next.id;
    }
  };

  return {
    create(socketId: string, displayName: string, ruleSet: RuleSet): JoinResult {
      const parsed = roomRuleSetSchema.safeParse(ruleSet);
      if (!parsed.success) {
        throw new Error("invalid_rules");
      }
      if (bySocket.has(socketId)) {
        throw new Error("already_in_room");
      }
      const player: InternalPlayer = {
        id: crypto.randomUUID(),
        displayName,
        seatIndex: 0,
        reconnectToken: crypto.randomUUID(),
        connected: true,
        socketId,
      };
      const room: InternalRoom = {
        code: newCode(random, new Set(rooms.keys())),
        hostPlayerId: player.id,
        status: "lobby",
        ruleSet: parsed.data,
        players: [player],
      };
      rooms.set(room.code, room);
      byPlayer.set(player.id, room.code);
      bySocket.set(socketId, player.id);
      return { room: snapshot(room), player: publicPlayer(player) };
    },

    join(
      socketId: string,
      roomCode: string,
      displayName: string,
      reconnectToken?: string,
    ): JoinResult {
      const room = rooms.get(roomCode);
      if (room === undefined) {
        throw new Error("not_found");
      }
      if (bySocket.has(socketId)) {
        throw new Error("already_in_room");
      }
      if (reconnectToken !== undefined) {
        const existing = room.players.find(
          (player) => player.reconnectToken === reconnectToken,
        );
        if (existing === undefined) {
          throw new Error("not_found");
        }
        existing.connected = true;
        existing.socketId = socketId;
        existing.displayName = displayName;
        bySocket.set(socketId, existing.id);
        byPlayer.set(existing.id, room.code);
        return { room: snapshot(room), player: publicPlayer(existing) };
      }
      if (room.status !== "lobby") {
        throw new Error("not_joinable");
      }
      if (room.players.length >= MAX_PLAYERS) {
        throw new Error("room_full");
      }
      const seats = new Set(room.players.map((player) => player.seatIndex));
      let seatIndex = 0;
      while (seats.has(seatIndex)) {
        seatIndex += 1;
      }
      const player: InternalPlayer = {
        id: crypto.randomUUID(),
        displayName,
        seatIndex,
        reconnectToken: crypto.randomUUID(),
        connected: true,
        socketId,
      };
      room.players.push(player);
      byPlayer.set(player.id, room.code);
      bySocket.set(socketId, player.id);
      return { room: snapshot(room), player: publicPlayer(player) };
    },

    disconnect(socketId: string): RoomSnapshot | null {
      const playerId = bySocket.get(socketId);
      if (playerId === undefined) {
        return null;
      }
      bySocket.delete(socketId);
      const room = requireRoom(playerId);
      const player = room.players.find((item) => item.id === playerId);
      if (player === undefined) {
        return null;
      }
      player.connected = false;
      return snapshot(room);
    },

    leave(playerId: string): RoomSnapshot | null {
      const room = requireRoom(playerId);
      const leaving = room.players.find((player) => player.id === playerId);
      room.players = room.players.filter((player) => player.id !== playerId);
      byPlayer.delete(playerId);
      if (leaving !== undefined) {
        bySocket.delete(leaving.socketId);
      }
      for (const [socketId, id] of [...bySocket.entries()]) {
        if (id === playerId) {
          bySocket.delete(socketId);
        }
      }
      if (room.hostPlayerId === playerId) {
        promoteHost(room);
      }
      dropRoomIfEmpty(room);
      if (room.players.length === 0) {
        return null;
      }
      return snapshot(room);
    },

    kick(hostPlayerId: string, targetId: string): RoomSnapshot {
      const room = requireHost(hostPlayerId);
      if (room.status !== "lobby") {
        throw new Error("not_lobby");
      }
      if (targetId === hostPlayerId) {
        throw new Error("forbidden");
      }
      const target = room.players.find((player) => player.id === targetId);
      if (target === undefined) {
        throw new Error("not_found");
      }
      const next = this.leave(targetId);
      if (next === null) {
        throw new Error("not_found");
      }
      return next;
    },

    updateRules(hostPlayerId: string, ruleSet: RuleSet): RoomSnapshot {
      const room = requireHost(hostPlayerId);
      if (room.status !== "lobby") {
        throw new Error("not_lobby");
      }
      const parsed = roomRuleSetSchema.safeParse(ruleSet);
      if (!parsed.success) {
        throw new Error("invalid_rules");
      }
      room.ruleSet = parsed.data;
      return snapshot(room);
    },

    start(hostPlayerId: string): RoomSnapshot {
      const room = requireHost(hostPlayerId);
      if (room.status !== "lobby") {
        throw new Error("not_lobby");
      }
      const connected = room.players.filter((player) => player.connected).length;
      if (connected < MIN_PLAYERS_VERSUS) {
        throw new Error("not_enough_players");
      }
      room.status = "starting";
      return snapshot(room);
    },

    snapshotForPlayer(playerId: string): RoomSnapshot {
      return snapshot(requireRoom(playerId));
    },

    playerIdForSocket(socketId: string): string | undefined {
      return bySocket.get(socketId);
    },
  };
}

export type RoomManager = ReturnType<typeof createRoomManager>;
