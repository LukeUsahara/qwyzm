import { asc, eq, or } from "drizzle-orm";
import {
  DEFAULT_GENRE_PLAY_FILTER,
  isAdminRole,
  type GenrePlayFilter,
  type QuestionSet,
} from "@qwyzm/shared";
import {
  canReadSet,
  canWriteSet,
  type QuestionSetRepository,
} from "@qwyzm/play-data";
import { questionSetItems, questionSets } from "./schema.ts";
import type { AppDb } from "./client.ts";

function asFilter(raw: unknown): GenrePlayFilter {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_GENRE_PLAY_FILTER;
  }
  const value = raw as Partial<GenrePlayFilter>;
  return {
    allMain: value.allMain ?? true,
    selectedGenreIds: [...(value.selectedGenreIds ?? [])],
    includeUnique: value.includeUnique ?? false,
    selectedUniqueGenreIds: [...(value.selectedUniqueGenreIds ?? [])],
  };
}

export function createDrizzleQuestionSetRepository(db: AppDb): QuestionSetRepository {
  async function load(id: string): Promise<QuestionSet | null> {
    const rows = await db.select().from(questionSets).where(eq(questionSets.id, id));
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    const items = await db
      .select()
      .from(questionSetItems)
      .where(eq(questionSetItems.setId, id))
      .orderBy(asc(questionSetItems.orderIndex));
    return {
      id: row.id,
      name: row.name,
      ownerId: row.ownerUserId,
      visibility: row.visibility,
      source: row.source,
      criteria: asFilter(row.criteria),
      questionIds: items.map((item) => item.questionId),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  return {
    async listSets(actor) {
      const rows =
        actor === null
          ? await db.select().from(questionSets).where(eq(questionSets.visibility, "official"))
          : await db
              .select()
              .from(questionSets)
              .where(
                or(
                  eq(questionSets.visibility, "official"),
                  eq(questionSets.ownerUserId, actor.id),
                ),
              );
      const listed: QuestionSet[] = [];
      for (const row of rows) {
        const set = await load(row.id);
        if (set && canReadSet(set, actor)) {
          listed.push(set);
        }
      }
      return listed.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    },
    async getSet(id, actor) {
      const set = await load(id);
      if (set === null || !canReadSet(set, actor)) {
        return null;
      }
      return set;
    },
    async saveSet(input, actor) {
      const existing = await load(input.id);
      if (existing && !canWriteSet(existing, actor)) {
        throw new Error("forbidden");
      }
      if (input.visibility === "official" && !isAdminRole(actor.role)) {
        throw new Error("forbidden");
      }
      const ownerUserId =
        input.visibility === "official" ? null : (existing?.ownerId ?? actor.id);
      const now = new Date();
      const values = {
        id: input.id,
        ownerUserId,
        name: input.name,
        visibility: input.visibility,
        source: input.source,
        criteria: {
          allMain: input.criteria.allMain,
          selectedGenreIds: [...input.criteria.selectedGenreIds],
          includeUnique: input.criteria.includeUnique,
          selectedUniqueGenreIds: [...input.criteria.selectedUniqueGenreIds],
        },
        updatedAt: now,
      };
      if (existing === null) {
        await db.insert(questionSets).values({ ...values, createdAt: now });
      } else {
        await db.update(questionSets).set(values).where(eq(questionSets.id, input.id));
        await db.delete(questionSetItems).where(eq(questionSetItems.setId, input.id));
      }
      if (input.source === "manual") {
        if (input.questionIds.length > 0) {
          await db.insert(questionSetItems).values(
            input.questionIds.map((questionId, orderIndex) => ({
              setId: input.id,
              questionId,
              orderIndex,
            })),
          );
        }
      }
      const saved = await load(input.id);
      if (saved === null) {
        throw new Error("failed to save set");
      }
      return saved;
    },
    async deleteSet(id, actor) {
      const existing = await load(id);
      if (existing === null) {
        return false;
      }
      if (!canWriteSet(existing, actor)) {
        throw new Error("forbidden");
      }
      await db.delete(questionSets).where(eq(questionSets.id, id));
      return true;
    },
  };
}
