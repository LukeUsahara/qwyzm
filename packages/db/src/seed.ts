import { inArray, notInArray, sql } from "drizzle-orm";
import { normalizeForJudge } from "@qwyzm/game-core";
import { FIXTURE_QUESTIONS, GENRES } from "@qwyzm/play-data";
import type { NamedAnswer, QuestionCatalogItem } from "@qwyzm/play-data";
import {
  genres,
  questionAnswers,
  questionGenres,
  questions,
} from "./schema.ts";
import type { AppDb } from "./client.ts";

type AnswerRow = {
  questionId: string;
  kind: "correct" | "close";
  displayText: string;
  normalizedText: string;
  reveal: "primary" | "silent" | "alternate";
  sortOrder: number;
};

function pushNamed(
  rows: AnswerRow[],
  item: QuestionCatalogItem,
  named: NamedAnswer,
  reveal: "primary" | "alternate",
  sort: { value: number },
) {
  rows.push({
    questionId: item.id,
    kind: "correct",
    displayText: named.displayText,
    normalizedText: normalizeForJudge(named.inputText),
    reveal,
    sortOrder: sort.value++,
  });
  for (const silent of named.silentInputs) {
    rows.push({
      questionId: item.id,
      kind: "correct",
      displayText: "",
      normalizedText: normalizeForJudge(silent),
      reveal: "silent",
      sortOrder: sort.value++,
    });
  }
}

export function catalogAnswerRows(item: QuestionCatalogItem) {
  const rows: AnswerRow[] = [];
  const sort = { value: 0 };
  pushNamed(rows, item, item.primary, "primary", sort);
  for (const alternate of item.alternates) {
    pushNamed(rows, item, alternate, "alternate", sort);
  }
  item.closeInputs.forEach((input, index) => {
    rows.push({
      questionId: item.id,
      kind: "close",
      displayText: "",
      normalizedText: normalizeForJudge(input),
      reveal: "silent",
      sortOrder: index,
    });
  });
  return rows;
}

async function removeObsoleteGenres(db: AppDb): Promise<void> {
  const keepIds = GENRES.map((genre) => genre.id);
  const keepSlugs = GENRES.map((genre) => genre.slug);
  const obsoleteBySlug = await db
    .select({ id: genres.id })
    .from(genres)
    .where(notInArray(genres.slug, keepSlugs));
  const dropIds = obsoleteBySlug.map((row) => row.id);
  await db.delete(questionGenres).where(notInArray(questionGenres.genreId, keepIds));
  if (dropIds.length > 0) {
    await db.delete(questionGenres).where(inArray(questionGenres.genreId, dropIds));
  }
  const obsolete = await db
    .select({ id: genres.id, parentId: genres.parentId })
    .from(genres)
    .where(notInArray(genres.id, keepIds));
  const leftover = [...obsolete];
  while (leftover.length > 0) {
    const leaves = leftover.filter(
      (row) => !leftover.some((other) => other.parentId === row.id),
    );
    const batch = leaves.length > 0 ? leaves : leftover;
    await db.delete(genres).where(
      inArray(
        genres.id,
        batch.map((row) => row.id),
      ),
    );
    const removed = new Set(batch.map((row) => row.id));
    leftover.splice(
      0,
      leftover.length,
      ...leftover.filter((row) => !removed.has(row.id)),
    );
  }
}

export async function seedCatalog(db: AppDb): Promise<void> {
  await removeObsoleteGenres(db);

  const remaining = [...GENRES];
  const inserted = new Set<string>();
  while (remaining.length > 0) {
    const ready = remaining.filter(
      (genre) => genre.parentId === null || inserted.has(genre.parentId),
    );
    if (ready.length === 0) {
      throw new Error("genre tree has a cycle or missing parent");
    }
    await db
      .insert(genres)
      .values(ready)
      .onConflictDoUpdate({
        target: genres.id,
        set: {
          parentId: sql`excluded.parent_id`,
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          sortOrder: sql`excluded.sort_order`,
          kind: sql`excluded.kind`,
        },
      });
    for (const genre of ready) {
      inserted.add(genre.id);
    }
    const readyIds = new Set(ready.map((genre) => genre.id));
    remaining.splice(
      0,
      remaining.length,
      ...remaining.filter((genre) => !readyIds.has(genre.id)),
    );
  }

  await db
    .insert(questions)
    .values(
      FIXTURE_QUESTIONS.map((item) => ({
        id: item.id,
        body: item.body,
        status: item.status ?? "official",
        createdBy: item.createdBy ?? null,
        difficultyRank: item.difficultyRank ?? null,
        sourceText: item.source?.text ?? null,
        sourceUrl: item.source?.url ?? null,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: questions.id,
      set: {
        body: sql`excluded.body`,
        status: sql`excluded.status`,
        difficultyRank: sql`excluded.difficulty_rank`,
        sourceText: sql`excluded.source_text`,
        sourceUrl: sql`excluded.source_url`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const questionIds = FIXTURE_QUESTIONS.map((item) => item.id);
  await db.delete(questionAnswers).where(inArray(questionAnswers.questionId, questionIds));
  await db.delete(questionGenres).where(inArray(questionGenres.questionId, questionIds));

  const answerRows = FIXTURE_QUESTIONS.flatMap(catalogAnswerRows);
  if (answerRows.length > 0) {
    await db.insert(questionAnswers).values(answerRows);
  }

  const genreRows = FIXTURE_QUESTIONS.flatMap((item) =>
    item.genreIds.map((genreId) => ({
      questionId: item.id,
      genreId,
    })),
  );
  if (genreRows.length > 0) {
    await db.insert(questionGenres).values(genreRows);
  }
}
