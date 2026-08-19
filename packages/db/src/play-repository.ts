import { and, eq, inArray } from "drizzle-orm";
import { normalizeForJudge, SOLO_DEFAULT_SETTINGS } from "@qwyzm/game-core";
import type { PlayRepository, StoredAttempt, StoredGame } from "@qwyzm/play-data";
import type { AppDb } from "./client.ts";
import {
  gamePlayers,
  gameQuestions,
  games,
  questionPlayRecords,
  users,
} from "./schema.ts";

function toDate(value: string): Date {
  return new Date(value);
}

function toIso(value: Date | null): string {
  return (value ?? new Date()).toISOString();
}

function toAttempt(
  row: typeof questionPlayRecords.$inferSelect,
  questionIndex: number,
): StoredAttempt {
  return {
    id: row.id,
    gameId: row.gameId,
    questionId: row.questionId,
    questionIndex,
    questionBody: row.questionBody,
    genreIds: row.genreIds ?? [],
    result: row.result === "withdrawn" ? "unanswered" : row.result,
    answerRaw: row.answerRaw,
    answerReveal: row.answerDisplay,
    buzzTimeMs: row.buzzTimeMs,
    buzzCharIndex: row.buzzCharIndex,
    buzzRank: row.buzzRank,
    answerStartMs: row.answerStartMs,
    answerSubmitMs: row.answerSubmitMs,
    closeCount: row.closeCount,
  };
}

export function createDrizzlePlayRepository(
  db: AppDb,
  userId: string,
): PlayRepository {
  return {
    async listGames() {
      const owned = await db
        .select({ gameId: gamePlayers.gameId })
        .from(gamePlayers)
        .where(eq(gamePlayers.userId, userId));
      const ids = [...new Set(owned.map((row) => row.gameId))];
      if (ids.length === 0) {
        return [];
      }

      const gameRows = await db
        .select()
        .from(games)
        .where(inArray(games.id, ids));
      const playerRows = await db
        .select()
        .from(gamePlayers)
        .where(and(inArray(gamePlayers.gameId, ids), eq(gamePlayers.userId, userId)));
      const questionRows = await db
        .select()
        .from(gameQuestions)
        .where(inArray(gameQuestions.gameId, ids));
      const recordRows = await db
        .select()
        .from(questionPlayRecords)
        .where(
          and(
            inArray(questionPlayRecords.gameId, ids),
            eq(questionPlayRecords.userId, userId),
          ),
        );

      const orderByGame = new Map<string, Map<string, number>>();
      for (const row of questionRows) {
        const map = orderByGame.get(row.gameId) ?? new Map<string, number>();
        map.set(row.id, row.orderIndex);
        orderByGame.set(row.gameId, map);
      }

      const attemptsByGame = new Map<string, StoredAttempt[]>();
      for (const row of recordRows) {
        const questionIndex = orderByGame.get(row.gameId)?.get(row.gameQuestionId) ?? 0;
        const list = attemptsByGame.get(row.gameId) ?? [];
        list.push(toAttempt(row, questionIndex));
        attemptsByGame.set(row.gameId, list);
      }

      const scoreByGame = new Map(playerRows.map((row) => [row.gameId, row.score]));

      return gameRows
        .map((row): StoredGame => {
          const attempts = (attemptsByGame.get(row.id) ?? []).sort(
            (a, b) => a.questionIndex - b.questionIndex,
          );
          const settings = row.settings ?? {};
          return {
            id: row.id,
            mode: "solo",
            startedAt: toIso(row.startedAt),
            endedAt: toIso(row.endedAt),
            selectedGenreIds: settings.selectedGenreIds ?? [],
            questionCount: row.questionCount,
            score: scoreByGame.get(row.id) ?? 0,
            attempts,
          };
        })
        .sort((a, b) => (a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0));
    },

    async saveGame(game) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user === undefined) {
        throw new Error("user not found");
      }

      await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(games).where(eq(games.id, game.id));
        if (existing !== undefined && existing.hostUserId !== userId) {
          throw new Error("game belongs to another user");
        }
        await tx.delete(games).where(eq(games.id, game.id));

        await tx.insert(games).values({
          id: game.id,
          mode: "solo",
          hostUserId: userId,
          questionCount: game.attempts.length,
          winCondition: SOLO_DEFAULT_SETTINGS.winCondition,
          targetPoints: SOLO_DEFAULT_SETTINGS.targetPoints,
          correctPoints: SOLO_DEFAULT_SETTINGS.correctPoints,
          missPenalty: SOLO_DEFAULT_SETTINGS.missPenalty,
          missPoints: SOLO_DEFAULT_SETTINGS.missPoints,
          wrongAnswerRule: SOLO_DEFAULT_SETTINGS.wrongAnswerRule,
          revealSpeed: SOLO_DEFAULT_SETTINGS.revealSpeed,
          startedAt: toDate(game.startedAt),
          endedAt: toDate(game.endedAt),
          settings: { selectedGenreIds: [...game.selectedGenreIds] },
        });

        await tx.insert(gamePlayers).values({
          gameId: game.id,
          userId,
          seatIndex: 0,
          displayName: user.name,
          isHost: true,
          score: game.score,
          rank: 1,
          withdrawn: false,
        });

        for (const attempt of game.attempts) {
          const [question] = await tx
            .insert(gameQuestions)
            .values({
              gameId: game.id,
              questionId: attempt.questionId,
              orderIndex: attempt.questionIndex,
            })
            .returning({ id: gameQuestions.id });
          if (question === undefined) {
            throw new Error("failed to store game question");
          }
          await tx.insert(questionPlayRecords).values({
            id: attempt.id,
            gameId: game.id,
            gameQuestionId: question.id,
            questionId: attempt.questionId,
            userId,
            playerSeat: 0,
            result: attempt.result,
            questionBody: attempt.questionBody,
            answerRaw: attempt.answerRaw,
            answerNormalized:
              attempt.answerRaw === null ? null : normalizeForJudge(attempt.answerRaw),
            answerDisplay: attempt.answerReveal,
            genreIds: [...attempt.genreIds],
            buzzTimeMs: attempt.buzzTimeMs,
            buzzCharIndex: attempt.buzzCharIndex,
            buzzRank: attempt.buzzRank,
            answerStartMs: attempt.answerStartMs,
            answerSubmitMs: attempt.answerSubmitMs,
            closeCount: attempt.closeCount,
          });
        }
      });
    },

    async clear() {
      const owned = await db
        .select({ gameId: gamePlayers.gameId })
        .from(gamePlayers)
        .where(eq(gamePlayers.userId, userId));
      const ids = owned.map((row) => row.gameId);
      if (ids.length === 0) {
        return;
      }
      await db.delete(games).where(inArray(games.id, ids));
    },
  };
}
