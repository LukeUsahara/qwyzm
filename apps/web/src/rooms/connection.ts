import type { PlayerConnection, PublicGameView, QuestionPlayRecord } from "@qwyzm/game-core";
import type { RoomSnapshot, RuleSet } from "@qwyzm/shared";
import { isLocalQuestionSetId } from "@qwyzm/shared";
import type { ClientRoomMessage } from "@qwyzm/validation";
import { offsetFromProbe } from "@qwyzm/game-core";

export type SignalingEvent =
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

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function tokenKey(code: string): string {
  return `qwyzm.room.${code}`;
}

export function roomRuleSet(ruleSet: RuleSet): Extract<ClientRoomMessage, { type: "create" }>["ruleSet"] {
  const questionSetId =
    ruleSet.questionSetId !== null && isLocalQuestionSetId(ruleSet.questionSetId)
      ? null
      : ruleSet.questionSetId;
  return {
    ...ruleSet,
    questionSetId,
    genreFilter: {
      allMain: ruleSet.genreFilter.allMain,
      selectedGenreIds: [...ruleSet.genreFilter.selectedGenreIds],
      includeUnique: ruleSet.genreFilter.includeUnique,
      selectedUniqueGenreIds: [...ruleSet.genreFilter.selectedUniqueGenreIds],
    },
  };
}

export function createRoomConnection(handlers: {
  onEvent: (event: SignalingEvent) => void;
  onClose: () => void;
}): {
  send: (message: ClientRoomMessage) => void;
  close: () => void;
} {
  const socket = new WebSocket(wsUrl());
  socket.addEventListener("message", (event) => {
    try {
      handlers.onEvent(JSON.parse(String(event.data)) as SignalingEvent);
    } catch {
      handlers.onEvent({ type: "error", code: "invalid_json" });
    }
  });
  socket.addEventListener("close", () => handlers.onClose());
  return {
    send: (message) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return;
      }
      socket.addEventListener(
        "open",
        () => socket.send(JSON.stringify(message)),
        { once: true },
      );
    },
    close: () => socket.close(),
  };
}

export function rememberReconnect(code: string, token: string) {
  sessionStorage.setItem(tokenKey(code), token);
}

export function rememberedReconnect(code: string): string | undefined {
  return sessionStorage.getItem(tokenKey(code)) ?? undefined;
}

export function probeOffset(t0: number, t1: number, t2: number): number {
  return offsetFromProbe({
    t0Local: t0,
    t1Remote: t1,
    t2Remote: t2,
    t3Local: Date.now(),
  }).offsetMs;
}
