import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { FIXTURE_QUESTIONS, GENRE, GENRES, filterCatalogByGenres } from "@qwyzm/play-data";
import { DEFAULT_GENRE_PLAY_FILTER } from "@qwyzm/shared";
import * as schema from "./schema.ts";
import { createDrizzleQuestionRepository } from "./question-repository.ts";
import { seedCatalog } from "./seed.ts";
import type { AppDb } from "./client.ts";
import { genres, questionAnswers, questions } from "./schema.ts";

const PEARL = "c0a80100-0000-4000-8000-000000000002";
const FUJI = "c0a80100-0000-4000-8000-000000000001";
const GENJI = "c0a80100-0000-4000-8000-000000000006";
const MAIN_PLAY_COUNT = filterCatalogByGenres(
  FIXTURE_QUESTIONS,
  GENRES,
  DEFAULT_GENRE_PLAY_FILTER,
).length;

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

async function createSeededDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  await seedCatalog(db as unknown as AppDb);
  return { client, db };
}

describe("db schema and seed", () => {
  it("applies migrations and creates question tables", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    const tables = await db.execute(sql`
      select tablename from pg_tables
      where schemaname = 'public'
      order by tablename
    `);
    const names = tables.rows.map((row) => String(row.tablename));
    expect(names).toEqual(expect.arrayContaining([
      "questions",
      "question_answers",
      "genres",
      "question_genres",
      "question_play_records",
      "question_sets",
      "question_set_items",
      "users",
      "sessions",
      "accounts",
      "verifications",
    ]));
    const columns = await db.execute(sql`
      select column_name from information_schema.columns
      where table_name = 'questions'
    `);
    const columnNames = columns.rows.map((row) => String(row.column_name));
    expect(columnNames).toEqual(
      expect.arrayContaining(["id", "body", "created_at", "updated_at", "source_text"]),
    );
    await client.close();
  });

  it("seeds fixtures idempotently and keeps ids", async () => {
    const { client, db } = await createSeededDb();
    await seedCatalog(db as unknown as AppDb);
    const questionRows = await db.select().from(questions);
    const answerRows = await db.select().from(questionAnswers);
    const genreRows = await db.select().from(genres);
    expect(questionRows).toHaveLength(FIXTURE_QUESTIONS.length);
    expect(genreRows).toHaveLength(GENRES.length);
    expect(questionRows.some((row) => row.id === FUJI)).toBe(true);
    expect(answerRows.filter((row) => row.questionId === PEARL && row.kind === "correct")).toHaveLength(2);
    await client.close();
  });
});

describe("drizzle QuestionRepository", () => {
  it("lists, fetches by id, and filters genres like the memory repository", async () => {
    const { client, db } = await createSeededDb();
    const repo = createDrizzleQuestionRepository(db as unknown as AppDb);

    expect(await repo.listQuestions()).toHaveLength(MAIN_PLAY_COUNT);

    const pearl = await repo.getQuestion(PEARL);
    expect(pearl?.primary.inputText).toBe("ぶたにしんじゅ");
    expect(pearl?.primary.silentInputs).toEqual(["しんじゅ"]);
    expect(await repo.getQuestion("c0a80100-0000-4000-8000-00000000ffff")).toBeNull();

    const science = await repo.listQuestions({ genreIds: [GENRE.physics] });
    expect(science).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.physics]).length,
    );

    const history = await repo.listQuestions({ genreIds: [GENRE.history] });
    expect(history.some((question) => question.id === GENJI)).toBe(true);
    expect(history).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.history]).length,
    );

    const mixed = await repo.listQuestions({
      genreIds: [GENRE.history, GENRE.physics],
    });
    expect(mixed).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, [GENRE.history, GENRE.physics]).length,
    );

    const fuji = await repo.getQuestion(FUJI);
    expect(fuji?.closeInputs).toEqual(["ふじのやま"]);

    const draft = await repo.saveQuestion({
      id: "c0a80100-0000-4000-8000-00000000d001",
      body: "下書きの山は？",
      primary: { displayText: "下書き山", inputText: "したがきやま", silentInputs: [] },
      alternates: [],
      closeInputs: [],
      genreIds: [GENRE.geography],
      status: "draft",
    });
    expect(draft.status).toBe("draft");
    expect(await repo.listQuestions()).toHaveLength(MAIN_PLAY_COUNT);
    expect(await repo.listQuestions({ includeUnpublished: true })).toHaveLength(
      MAIN_PLAY_COUNT + 1,
    );

    await client.close();
  });
});
