import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import { emptyQuestionSet } from "@qwyzm/shared";
import { FIXTURE_QUESTIONS } from "@qwyzm/play-data";
import * as schema from "./schema.ts";
import { createDrizzleQuestionSetRepository } from "./question-set-repository.ts";
import { seedCatalog } from "./seed.ts";
import type { AppDb } from "./client.ts";
import { users } from "./schema.ts";

const FUJI = "c0a80100-0000-4000-8000-000000000001";
const USER_A = "c0a80300-0000-4000-8000-000000000001";
const USER_B = "c0a80300-0000-4000-8000-000000000002";
const ADMIN = "c0a80300-0000-4000-8000-00000000ad01";
const SET_A = "c0a80600-0000-4000-8000-000000000010";
const SET_OFFICIAL = "c0a80600-0000-4000-8000-000000000011";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

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
    {
      id: ADMIN,
      name: "Admin",
      handle: "admin",
      email: "admin@qwyzm.com",
      emailVerified: false,
      role: "admin",
    },
  ]);
  return { client, db: db as unknown as AppDb };
}

describe("drizzle QuestionSetRepository", () => {
  it("stores private and official sets with ACL", async () => {
    const { client, db } = await createSeededDb();
    const repo = createDrizzleQuestionSetRepository(db);
    const user = { id: USER_A, role: "user" as const };
    const other = { id: USER_B, role: "user" as const };
    const admin = { id: ADMIN, role: "admin" as const };

    const saved = await repo.saveSet(
      emptyQuestionSet({
        id: SET_A,
        name: "手選び",
        visibility: "private",
        source: "manual",
        questionIds: [FUJI, FIXTURE_QUESTIONS[1]?.id ?? FUJI],
      }),
      user,
    );
    expect(saved.ownerId).toBe(USER_A);
    expect(saved.questionIds[0]).toBe(FUJI);
    expect(await repo.getSet(SET_A, other)).toBeNull();
    expect(await repo.getSet(SET_A, null)).toBeNull();

    await expect(
      repo.saveSet(
        emptyQuestionSet({
          id: SET_OFFICIAL,
          name: "公式",
          visibility: "official",
          source: "filter",
        }),
        user,
      ),
    ).rejects.toThrow("forbidden");

    const official = await repo.saveSet(
      emptyQuestionSet({
        id: SET_OFFICIAL,
        name: "公式",
        visibility: "official",
        source: "filter",
      }),
      admin,
    );
    expect(official.ownerId).toBeNull();
    expect(await repo.getSet(SET_OFFICIAL, null)).not.toBeNull();
    expect((await repo.listSets(user)).map((set) => set.id).sort()).toEqual(
      [SET_A, SET_OFFICIAL].sort(),
    );

    await client.close();
  });
});
