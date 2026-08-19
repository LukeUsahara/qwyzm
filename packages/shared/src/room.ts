import type { RuleSet } from "./settings.ts";

export type RoomStatus = "lobby" | "starting";

export type RoomPlayerPublic = {
  id: string;
  displayName: string;
  seatIndex: number;
  connected: boolean;
};

export type RoomSnapshot = {
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  ruleSet: RuleSet;
  players: RoomPlayerPublic[];
};
