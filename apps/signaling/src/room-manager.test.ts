import { describe, expect, it } from "vitest";
import { DEFAULT_RULE_SET, newLocalQuestionSetId } from "@qwyzm/shared";
import { createRoomManager } from "./room-manager.ts";

describe("RoomManager", () => {
  it("creates a room, joins a second player, and starts", () => {
    const rooms = createRoomManager({ random: () => 0 });
    const created = rooms.create("s1", "Host", DEFAULT_RULE_SET);
    expect(created.room.code).toHaveLength(6);
    expect(created.room.hostPlayerId).toBe(created.player.id);
    const joined = rooms.join("s2", created.room.code, "Guest");
    expect(joined.room.players).toHaveLength(2);
    expect(joined.room.ruleSet.questionCount).toBe(DEFAULT_RULE_SET.questionCount);
    const started = rooms.start(created.player.id);
    expect(started.status).toBe("starting");
  });

  it("reconnects to the same seat and lets only the host change rules or kick", () => {
    const rooms = createRoomManager({ random: () => 0 });
    const host = rooms.create("s1", "Host", DEFAULT_RULE_SET);
    const guest = rooms.join("s2", host.room.code, "Guest");
    rooms.disconnect("s2");
    const back = rooms.join("s3", host.room.code, "Guest2", guest.player.reconnectToken);
    expect(back.player.id).toBe(guest.player.id);
    expect(back.player.seatIndex).toBe(guest.player.seatIndex);
    expect(back.player.displayName).toBe("Guest");

    expect(() => rooms.updateRules(guest.player.id, DEFAULT_RULE_SET)).toThrow("forbidden");
    expect(() => rooms.kick(guest.player.id, host.player.id)).toThrow("forbidden");
    const afterKick = rooms.kick(host.player.id, guest.player.id);
    expect(afterKick.players.map((player) => player.id)).toEqual([host.player.id]);
  });

  it("rejects local question sets and start without two connected players", () => {
    const rooms = createRoomManager({ random: () => 0 });
    expect(() =>
      rooms.create("s1", "Host", {
        ...DEFAULT_RULE_SET,
        questionSetId: newLocalQuestionSetId(),
      }),
    ).toThrow("invalid_rules");
    const host = rooms.create("s1", "Host", DEFAULT_RULE_SET);
    expect(() => rooms.start(host.player.id)).toThrow("not_enough_players");
  });

  it("drops disconnected lobby seats on start and rejects mid-match join", () => {
    const rooms = createRoomManager({ random: () => 0 });
    const host = rooms.create("s1", "Host", DEFAULT_RULE_SET);
    const guest = rooms.join("s2", host.room.code, "Guest");
    rooms.join("s3", host.room.code, "Third");
    rooms.disconnect("s3");
    const started = rooms.start(host.player.id);
    expect(started.players.map((player) => player.displayName)).toEqual(["Host", "Guest"]);
    rooms.setStatus(host.room.code, "in_game");
    expect(() => rooms.join("s4", host.room.code, "Late")).toThrow("match_in_progress");
    const back = rooms.join("s5", host.room.code, "Ignored", guest.player.reconnectToken);
    expect(back.player.id).toBe(guest.player.id);
  });
});
