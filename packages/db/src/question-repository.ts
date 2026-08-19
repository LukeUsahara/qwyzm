import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Genre } from "@qwyzm/shared";
import { allowedGenreIdsForPlay } from "@qwyzm/shared";
import type {
  QuestionCatalogItem,
  QuestionListFilter,
  QuestionRepository,
} from "@qwyzm/play-data";
import { catalogAnswersFromRows, resolveGenrePlayFilter } from "@qwyzm/play-data";
import {
  genres,
  questionAnswers,
  questionGenres,
  questions,
} from "./schema.ts";
import type { AppDb } from "./client.ts";
import { catalogAnswerRows } from "./seed.ts";

function toGenre(row: typeof genres.$inferSelect): Genre {
  return {
    id: row.id,
    parentId: row.parentId,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sortOrder,
    kind: row.kind,
  };
}

function assemble(
  question: typeof questions.$inferSelect,
  answers: (typeof questionAnswers.$inferSelect)[],
  genreIds: string[],
): QuestionCatalogItem {
  const nested = catalogAnswersFromRows(
    answers
      .filter((row) => row.kind === "correct")
      .map((row) => ({
        displayText: row.displayText,
        normalizedText: row.normalizedText,
        reveal: row.reveal,
        sortOrder: row.sortOrder,
      })),
    answers
      .filter((row) => row.kind === "close")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({ normalizedText: row.normalizedText })),
  );
  return {
    id: question.id,
    body: question.body,
    ...nested,
    genreIds,
    status: question.status,
    difficultyRank: question.difficultyRank,
    createdBy: question.createdBy,
    source:
      question.sourceText || question.sourceUrl
        ? {
            text: question.sourceText ?? "",
            url: question.sourceUrl ?? undefined,
          }
        : null,
  };
}

export function createDrizzleQuestionRepository(db: AppDb): QuestionRepository {
  return {
    async listGenres() {
      const rows = await db.select().from(genres).orderBy(genres.sortOrder);
      return rows.map(toGenre);
    },

    async listQuestions(filter?: QuestionListFilter) {
      const genreRows = await db.select().from(genres);
      const genreList = genreRows.map(toGenre);
      const questionRows = await db
        .select()
        .from(questions)
        .where(
          filter?.includeUnpublished
            ? isNull(questions.deletedAt)
            : and(isNull(questions.deletedAt), eq(questions.status, "official")),
        )
        .orderBy(questions.id);

      const playFilter = resolveGenrePlayFilter(filter);
      const allowed = allowedGenreIdsForPlay(genreList, playFilter);

      const scoped =
        allowed.size === 0
          ? []
          : await (async () => {
              const links = await db
                .select()
                .from(questionGenres)
                .where(inArray(questionGenres.genreId, [...allowed]));
              const ids = new Set(links.map((link) => link.questionId));
              return questionRows.filter((row) => ids.has(row.id));
            })();

      return assembleMany(db, scoped);
    },

    async getQuestion(id: string) {
      const [row] = await db
        .select()
        .from(questions)
        .where(and(eq(questions.id, id), isNull(questions.deletedAt)));
      if (row === undefined) {
        return null;
      }
      const [item] = await assembleMany(db, [row]);
      return item ?? null;
    },

    async saveQuestion(item: QuestionCatalogItem) {
      const id = item.id.length > 0 ? item.id : crypto.randomUUID();
      const status = item.status ?? "official";
      if (status === "user") {
        throw new Error("official editor cannot write user questions");
      }

      await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: questions.id })
          .from(questions)
          .where(eq(questions.id, id));
        const values = {
          body: item.body,
          status,
          createdBy: item.createdBy ?? null,
          difficultyRank: item.difficultyRank ?? null,
          sourceText: item.source?.text ?? null,
          sourceUrl: item.source?.url ?? null,
          updatedAt: new Date(),
          deletedAt: null,
        };
        if (existing === undefined) {
          await tx.insert(questions).values({ id, ...values });
        } else {
          await tx.update(questions).set(values).where(eq(questions.id, id));
        }

        await tx.delete(questionAnswers).where(eq(questionAnswers.questionId, id));
        await tx.delete(questionGenres).where(eq(questionGenres.questionId, id));

        const stored: QuestionCatalogItem = { ...item, id, status };
        const answerRows = catalogAnswerRows(stored);
        if (answerRows.length > 0) {
          await tx.insert(questionAnswers).values(answerRows);
        }
        if (stored.genreIds.length > 0) {
          await tx.insert(questionGenres).values(
            stored.genreIds.map((genreId) => ({
              questionId: id,
              genreId,
            })),
          );
        }
      });

      const [row] = await db
        .select()
        .from(questions)
        .where(and(eq(questions.id, id), isNull(questions.deletedAt)));
      if (row === undefined) {
        throw new Error("failed to save question");
      }
      const [saved] = await assembleMany(db, [row]);
      if (saved === undefined) {
        throw new Error("failed to save question");
      }
      return saved;
    },
  };
}

async function assembleMany(
  db: AppDb,
  questionRows: (typeof questions.$inferSelect)[],
): Promise<QuestionCatalogItem[]> {
  if (questionRows.length === 0) {
    return [];
  }
  const ids = questionRows.map((row) => row.id);
  const answerRows = await db
    .select()
    .from(questionAnswers)
    .where(inArray(questionAnswers.questionId, ids));
  const linkRows = await db
    .select()
    .from(questionGenres)
    .where(inArray(questionGenres.questionId, ids));

  const answersByQuestion = new Map<string, typeof answerRows>();
  for (const row of answerRows) {
    const list = answersByQuestion.get(row.questionId) ?? [];
    list.push(row);
    answersByQuestion.set(row.questionId, list);
  }
  const genresByQuestion = new Map<string, string[]>();
  for (const row of linkRows) {
    const list = genresByQuestion.get(row.questionId) ?? [];
    list.push(row.genreId);
    genresByQuestion.set(row.questionId, list);
  }

  return questionRows.map((question) =>
    assemble(
      question,
      answersByQuestion.get(question.id) ?? [],
      genresByQuestion.get(question.id) ?? [],
    ),
  );
}
