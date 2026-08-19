import { describe, expect, it } from "vitest";
import {
  createMemoryPlayRepository,
  createMemoryQuestionRepository,
  filterCatalogByGenres,
  FIXTURE_QUESTIONS,
  GENRE,
  GENRES,
  type StoredGame,
} from "@qwyzm/play-data";
import { DEFAULT_GENRE_PLAY_FILTER } from "@qwyzm/shared";
import { createApp, type AuthGateway, type AuthUser } from "./app.ts";

const PEARL = "c0a80100-0000-4000-8000-000000000002";
const FUJI = "c0a80100-0000-4000-8000-000000000001";
const GENJI = "c0a80100-0000-4000-8000-000000000006";
const USER_A: AuthUser = {
  id: "c0a80300-0000-4000-8000-000000000001",
  name: "Alice",
  email: "alice@example.com",
  handle: "alice",
  role: "user",
};
const USER_B: AuthUser = {
  id: "c0a80300-0000-4000-8000-000000000002",
  name: "Bob",
  email: "bob@example.com",
  handle: "bob",
  role: "user",
};
const ADMIN: AuthUser = {
  id: "c0a80300-0000-4000-8000-00000000ad01",
  name: "Administer",
  email: "admin@qwyzm.com",
  handle: "admin",
  role: "admin",
};

const questions = createMemoryQuestionRepository({
  genres: GENRES,
  questions: FIXTURE_QUESTIONS,
});

const app = createApp(questions);

function fakeAuth(user: AuthUser | null): AuthGateway {
  return {
    handler: async () => new Response("not used", { status: 404 }),
    async getSession() {
      return user ? { user } : null;
    },
  };
}

function sampleGame(id: string): StoredGame {
  const fuji = FIXTURE_QUESTIONS[0];
  if (fuji === undefined) {
    throw new Error("no fixture");
  }
  return {
    id,
    mode: "solo",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:05:00.000Z",
    selectedGenreIds: [],
    questionCount: 1,
    score: 1,
    attempts: [
      {
        id: "c0a80500-0000-4000-8000-000000000001",
        gameId: id,
        questionId: fuji.id,
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
      },
    ],
  };
}

describe("question API", () => {
  it("lists questions", async () => {
    const res = await app.request("/api/questions");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { questions: { id: string }[] };
    expect(body.questions).toHaveLength(
      filterCatalogByGenres(FIXTURE_QUESTIONS, GENRES, DEFAULT_GENRE_PLAY_FILTER).length,
    );
  });

  it("gets a question by id with multiple answers", async () => {
    const res = await app.request(`/api/questions/${PEARL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      question: { primary: { inputText: string; silentInputs: string[] } };
    };
    expect(body.question.primary.inputText).toBe("ぶたにしんじゅ");
    expect(body.question.primary.silentInputs).toEqual(["しんじゅ"]);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await app.request("/api/questions/c0a80100-0000-4000-8000-00000000ffff");
    expect(res.status).toBe(404);
  });

  it("filters by genre, parent genre, and multiple genres", async () => {
    const science = await app.request(`/api/questions?genreIds=${GENRE.physics}`);
    const scienceBody = (await science.json()) as { questions: { id: string }[] };
    expect(scienceBody.questions).toHaveLength(
      FIXTURE_QUESTIONS.filter((question) => question.genreIds.includes(GENRE.physics)).length,
    );

    const history = await app.request(`/api/questions?genreIds=${GENRE.history}`);
    const historyBody = (await history.json()) as { questions: { id: string }[] };
    expect(historyBody.questions.some((question) => question.id === GENJI)).toBe(true);
    expect(historyBody.questions.length).toBeGreaterThan(1);

    const mixed = await app.request(
      `/api/questions?genreIds=${GENRE.history},${GENRE.physics}`,
    );
    const mixedBody = (await mixed.json()) as { questions: { id: string }[] };
    expect(mixedBody.questions.length).toBeGreaterThan(scienceBody.questions.length);
  });

  it("returns close answers", async () => {
    const res = await app.request(`/api/questions/${FUJI}`);
    const body = (await res.json()) as {
      question: { closeInputs: string[] };
    };
    expect(body.question.closeInputs).toEqual(["ふじのやま"]);
  });
});

describe("play API", () => {
  it("rejects unauthenticated game access", async () => {
    const res = await app.request("/api/games");
    expect(res.status).toBe(401);
  });

  it("saves and lists games for the signed-in user only", async () => {
    const aliceRepo = createMemoryPlayRepository();
    const bobRepo = createMemoryPlayRepository();
    const repos = new Map([
      [USER_A.id, aliceRepo],
      [USER_B.id, bobRepo],
    ]);
    const aliceApp = createApp(questions, {
      auth: fakeAuth(USER_A),
      plays: (userId) => repos.get(userId) ?? createMemoryPlayRepository(),
    });
    const bobApp = createApp(questions, {
      auth: fakeAuth(USER_B),
      plays: (userId) => repos.get(userId) ?? createMemoryPlayRepository(),
    });

    const gameId = "c0a80400-0000-4000-8000-000000000001";
    const saved = await aliceApp.request("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleGame(gameId)),
    });
    expect(saved.status).toBe(200);

    const aliceList = await aliceApp.request("/api/games");
    const bobList = await bobApp.request("/api/games");
    const aliceBody = (await aliceList.json()) as { games: { id: string }[] };
    const bobBody = (await bobList.json()) as { games: unknown[] };
    expect(aliceBody.games).toHaveLength(1);
    expect(aliceBody.games[0]?.id).toBe(gameId);
    expect(bobBody.games).toHaveLength(0);

    const fetched = await aliceApp.request(`/api/games/${gameId}`);
    expect(fetched.status).toBe(200);
    const fetchedBody = (await fetched.json()) as { game: { id: string } };
    expect(fetchedBody.game.id).toBe(gameId);

    const missing = await aliceApp.request(
      "/api/games/c0a80400-0000-4000-8000-00000000ffff",
    );
    expect(missing.status).toBe(404);
  });
});

describe("admin question API", () => {
  it("rejects guests and regular users", async () => {
    const guest = await app.request("/api/admin/questions");
    expect(guest.status).toBe(401);

    const userApp = createApp(questions, { auth: fakeAuth(USER_A) });
    const forbidden = await userApp.request("/api/admin/questions");
    expect(forbidden.status).toBe(403);
  });

  it("lets an admin create a draft that stays out of play lists", async () => {
    const isolated = createMemoryQuestionRepository({
      genres: GENRES,
      questions: FIXTURE_QUESTIONS,
    });
    const adminApp = createApp(isolated, { auth: fakeAuth(ADMIN) });
    const playApp = createApp(isolated);
    const created = await adminApp.request("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "下書きの問題",
          status: "draft",
          genreIds: [GENRE.geography],
          primary: { displayText: "こたえ", inputText: "こたえ", silentInputs: [] },
        }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { question: { id: string; status: string } };
    expect(createdBody.question.status).toBe("draft");

    const playList = await playApp.request("/api/questions");
    const playBody = (await playList.json()) as { questions: { id: string }[] };
    expect(playBody.questions.some((question) => question.id === createdBody.question.id)).toBe(
      false,
    );

    const hidden = await playApp.request(`/api/questions/${createdBody.question.id}`);
    expect(hidden.status).toBe(404);

    const adminList = await adminApp.request("/api/admin/questions");
    const adminBody = (await adminList.json()) as { questions: { id: string }[] };
    expect(adminBody.questions.some((question) => question.id === createdBody.question.id)).toBe(
      true,
    );
  });
});
