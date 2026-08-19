import { describe, expect, it } from "vitest";
import { FakeClock } from "./clock.ts";
import { GameEngine } from "./engine.ts";
import { toPublicGameView } from "./public-view.ts";
import { SOLO_DEFAULT_SETTINGS, type PlayerConfig, type Question } from "./types.ts";

const PLAYER: PlayerConfig = { id: "p1", displayName: "A", seatIndex: 0 };
const OTHER: PlayerConfig = { id: "p2", displayName: "B", seatIndex: 1 };
const SECRET = "SECRETTEXTXYZ";

describe("toPublicGameView", () => {
  it("omits unread body and answers before reveal", () => {
    const clock = new FakeClock(0);
    const engine = new GameEngine(clock);
    const question: Question = {
      id: "11111111-1111-4111-8111-111111111111",
      body: `あ${SECRET}`,
      answers: [{ displayText: SECRET, normalizedText: "しーくれっと" }],
      closeAnswers: [],
      genreIds: [],
    };
    engine.start({
      settings: { ...SOLO_DEFAULT_SETTINGS, questionCount: 1 },
      players: [PLAYER, OTHER],
      questions: [question],
    });
    const view = engine.getView();
    const pub = toPublicGameView(view, {
      viewerId: OTHER.id,
      matchId: "m1",
      version: 1,
      now: clock.syncedNow(),
      connections: { [PLAYER.id]: "connected", [OTHER.id]: "connected" },
    });
    const json = JSON.stringify(pub);
    expect(json.includes(SECRET)).toBe(false);
    expect(pub.revealedFullText).toBeNull();
    expect(pub.correctAnswer).toBeNull();
    expect(pub.myAnswerInput).toBe("");
  });

  it("exposes readingStartedAt as revealedAt once reading begins", () => {
    const clock = new FakeClock(0);
    const engine = new GameEngine(clock);
    engine.start({
      settings: { ...SOLO_DEFAULT_SETTINGS, questionCount: 1 },
      players: [PLAYER, OTHER],
      questions: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          body: "あ",
          answers: [{ displayText: "あ", normalizedText: "あ" }],
          closeAnswers: [],
          genreIds: [],
        },
      ],
    });
    clock.advance(1_000);
    engine.tick();
    const view = engine.getView();
    const pub = toPublicGameView(view, {
      viewerId: PLAYER.id,
      matchId: "m1",
      version: 1,
      now: clock.syncedNow(),
      connections: { [PLAYER.id]: "connected", [OTHER.id]: "connected" },
    });
    expect(view.phase).toBe("reading");
    expect(pub.revealedAt).toBe(view.readingStartedAt);
  });
});
