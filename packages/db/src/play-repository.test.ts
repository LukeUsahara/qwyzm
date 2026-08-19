import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { FIXTURE_QUESTIONS } from "@qwyzm/play-data";
import type { StoredAttempt, StoredGame } from "@qwyzm/play-data";
import * as schema from "./schema.ts";
import { createDrizzlePlayRepository } from "./play-repository.ts";
import { seedCatalog } from "./seed.ts";
import type { AppDb } from "./client.ts";
import { users } from "./schema.ts";

const FUJI = "c0a80100-0000-4000-8000-000000000001";
const PEARL = "c0a80100-0000-4000-8000-000000000002";
const USER_A = "c0a80300-0000-4000-8000-000000000001";
const USER_B = "c0a80300-0000-4000-8000-000000000002";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

const fuji = FIXTURE_QUESTIONS.find((item) => item.id === FUJI)!;
const pearl = FIXTURE_QUESTIONS.find((item) => item.id === PEARL)!;

async function createSeededDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  await seedCatalog(db as unknown as AppDb);
  await db.insert(users).values([
    {
      id: USER_A,
      name: "Alice",
      handle: "alice",
      email: "alice@example.com",
      emailVerified: false,
    },
    {
      id: USER_B,
      name: "Bob",
      handle: "bob",
      email: "bob@example.com",
      emailVerified: false,
    },
  ]);
  return { client, db: db as unknown as AppDb };
}

function attempt(partial: Partial<StoredAttempt> & Pick<StoredAttempt, "id" | "gameId">): StoredAttempt {
  return {
    questionId: FUJI,
    questionIndex: 0,
    questionBody: fuji.body,
    genreIds: [...fuji.genreIds],
    result: "correct",
    answerRaw: "ふじさん",
    answerReveal: "富士山",
    buzzTimeMs: 400,
    buzzCharIndex: 8,
    buzzRank: 1,
    answerStartMs: 200,
    answerSubmitMs: 1500,
    closeCount: 0,
    ...partial,
  };
}

function game(
  id: string,
  userAttempts: StoredAttempt[],
  extra?: Partial<StoredGame>,
): StoredGame {
  return {
    id,
    mode: "solo",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: extra?.endedAt ?? "2026-01-01T00:05:00.000Z",
    selectedGenreIds: extra?.selectedGenreIds ?? [],
    questionCount: userAttempts.length,
    score: extra?.score ?? 1,
    attempts: userAttempts,
  };
}

describe("drizzle PlayRepository", () => {
  it("saves and lists only the current user's games with per-question buzz data", async () => {
    const { client, db } = await createSeededDb();
    const alice = createDrizzlePlayRepository(db, USER_A);
    const bob = createDrizzlePlayRepository(db, USER_B);

    const gameA = "c0a80400-0000-4000-8000-000000000001";
    const gameB = "c0a80400-0000-4000-8000-000000000002";

    await alice.saveGame(
      game(gameA, [
        attempt({
          id: "c0a80500-0000-4000-8000-000000000001",
          gameId: gameA,
          buzzCharIndex: 8,
        }),
        attempt({
          id: "c0a80500-0000-4000-8000-000000000002",
          gameId: gameA,
          questionId: PEARL,
          questionIndex: 1,
          questionBody: pearl.body,
          genreIds: [...pearl.genreIds],
          result: "incorrect",
          answerRaw: "ぶた",
          answerReveal: "豚に真珠",
          buzzCharIndex: 12,
        }),
      ]),
    );
    await bob.saveGame(
      game(
        gameB,
        [
          attempt({
            id: "c0a80500-0000-4000-8000-000000000003",
            gameId: gameB,
            buzzCharIndex: 20,
          }),
        ],
        { score: 0 },
      ),
    );

    const aliceGames = await alice.listGames();
    const bobGames = await bob.listGames();
    expect(aliceGames).toHaveLength(1);
    expect(bobGames).toHaveLength(1);
    expect(aliceGames[0]?.id).toBe(gameA);
    expect(aliceGames[0]?.attempts).toHaveLength(2);
    expect(aliceGames[0]?.attempts[0]?.buzzCharIndex).toBe(8);
    expect(aliceGames[0]?.attempts[0]?.questionId).toBe(FUJI);
    expect(aliceGames[0]?.attempts[1]?.questionId).toBe(PEARL);
    expect(bobGames[0]?.attempts[0]?.buzzCharIndex).toBe(20);

    await client.close();
  });

  it("overwrites the same game id for that user", async () => {
    const { client, db } = await createSeededDb();
    const alice = createDrizzlePlayRepository(db, USER_A);
    const gameId = "c0a80400-0000-4000-8000-000000000010";
    await alice.saveGame(
      game(gameId, [
        attempt({
          id: "c0a80500-0000-4000-8000-000000000010",
          gameId,
          result: "incorrect",
          buzzCharIndex: 15,
        }),
      ]),
    );
    await alice.saveGame(
      game(gameId, [
        attempt({
          id: "c0a80500-0000-4000-8000-000000000011",
          gameId,
          result: "correct",
          buzzCharIndex: 6,
        }),
      ]),
    );
    const loaded = await alice.listGames();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.attempts[0]?.buzzCharIndex).toBe(6);
    expect(loaded[0]?.attempts[0]?.result).toBe("correct");
    await client.close();
  });
});
