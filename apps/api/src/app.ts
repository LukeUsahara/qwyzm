import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import type { AccountRole } from "@qwyzm/shared";
import { isAccountRole, isAdminRole } from "@qwyzm/shared";
import type { PlayRepository, QuestionCatalogItem, QuestionRepository } from "@qwyzm/play-data";
import { isOfficialQuestion } from "@qwyzm/play-data";
import {
  catalogQuestionWriteSchema,
  genreIdsQuerySchema,
  storedGameSchema,
  uuidSchema,
} from "@qwyzm/validation";
import { authOrigins } from "./auth.ts";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: AccountRole;
};

export type AuthGateway = {
  handler: (request: Request) => Promise<Response>;
  getSession(headers: Headers): Promise<{ user: AuthUser } | null>;
};

function toCatalogItem(
  parsed: ReturnType<typeof catalogQuestionWriteSchema.parse>,
  createdBy: string | null,
): QuestionCatalogItem {
  return {
    id: parsed.id ?? crypto.randomUUID(),
    body: parsed.body,
    primary: parsed.primary,
    alternates: parsed.alternates,
    closeInputs: parsed.closeInputs,
    genreIds: parsed.genreIds,
    status: parsed.status,
    createdBy,
  };
}

export function createApp(
  questions: QuestionRepository,
  extras: {
    auth?: AuthGateway;
    plays?: (userId: string) => PlayRepository;
  } = {},
): Hono {
  const app = new Hono();
  const origins = authOrigins();
  app.use(
    "*",
    cors({
      origin: origins,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  async function requireAdmin(c: Context) {
    const session = await extras.auth?.getSession(c.req.raw.headers);
    if (!session) {
      return { ok: false as const, response: c.json({ error: "unauthorized" }, 401) };
    }
    if (!isAdminRole(session.user.role)) {
      return { ok: false as const, response: c.json({ error: "forbidden" }, 403) };
    }
    return { ok: true as const, user: session.user };
  }

  app.get("/health", (c) => c.json({ ok: true, service: "qwyzm-api" }));
  app.get("/api/health", (c) => c.json({ ok: true, service: "qwyzm-api" }));

  if (extras.auth) {
    const auth = extras.auth;
    app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
  }

  app.get("/api/genres", async (c) => {
    const genres = await questions.listGenres();
    return c.json({ genres });
  });

  app.get("/api/questions", async (c) => {
    const raw = c.req.query("genreIds") ?? "";
    const genreIds = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const parsed = genreIdsQuerySchema.safeParse(genreIds);
    if (!parsed.success) {
      return c.json({ error: "invalid genreIds" }, 400);
    }
    const uniqueRaw = c.req.query("uniqueGenreIds") ?? "";
    const uniqueGenreIds = uniqueRaw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const uniqueParsed = genreIdsQuerySchema.safeParse(uniqueGenreIds);
    if (!uniqueParsed.success) {
      return c.json({ error: "invalid uniqueGenreIds" }, 400);
    }
    const allMainRaw = c.req.query("allMain");
    const includeUniqueRaw = c.req.query("includeUnique");
    const allMain =
      allMainRaw === "0" || allMainRaw === "false"
        ? false
        : allMainRaw === "1" || allMainRaw === "true"
          ? true
          : undefined;
    const includeUnique =
      includeUniqueRaw === "1" || includeUniqueRaw === "true"
        ? true
        : includeUniqueRaw === "0" || includeUniqueRaw === "false"
          ? false
          : undefined;
    const list = await questions.listQuestions({
      allMain,
      genreIds: parsed.data,
      includeUnique,
      uniqueGenreIds: uniqueParsed.data,
    });
    return c.json({ questions: list });
  });

  app.get("/api/questions/:id", async (c) => {
    const parsed = uuidSchema.safeParse(c.req.param("id"));
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }
    const question = await questions.getQuestion(parsed.data);
    if (question === null || !isOfficialQuestion(question)) {
      return c.json({ error: "not found" }, 404);
    }
    return c.json({ question });
  });

  app.get("/api/me", async (c) => {
    const session = await extras.auth?.getSession(c.req.raw.headers);
    if (!session) {
      return c.json({ error: "unauthorized" }, 401);
    }
    return c.json({ user: session.user });
  });

  app.get("/api/games", async (c) => {
    const session = await extras.auth?.getSession(c.req.raw.headers);
    if (!session || extras.plays === undefined) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const games = await extras.plays(session.user.id).listGames();
    return c.json({ games });
  });

  app.post("/api/games", async (c) => {
    const session = await extras.auth?.getSession(c.req.raw.headers);
    if (!session || extras.plays === undefined) {
      return c.json({ error: "unauthorized" }, 401);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = storedGameSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid game" }, 400);
    }
    try {
      await extras.plays(session.user.id).saveGame(parsed.data);
    } catch {
      return c.json({ error: "failed to save game" }, 400);
    }
    return c.json({ ok: true, id: parsed.data.id });
  });

  app.get("/api/admin/questions", async (c) => {
    const access = await requireAdmin(c);
    if (!access.ok) {
      return access.response;
    }
    const list = await questions.listQuestions({ includeUnpublished: true });
    return c.json({ questions: list });
  });

  app.get("/api/admin/questions/:id", async (c) => {
    const access = await requireAdmin(c);
    if (!access.ok) {
      return access.response;
    }
    const parsed = uuidSchema.safeParse(c.req.param("id"));
    if (!parsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }
    const question = await questions.getQuestion(parsed.data);
    if (question === null) {
      return c.json({ error: "not found" }, 404);
    }
    return c.json({ question });
  });

  app.post("/api/admin/questions", async (c) => {
    const access = await requireAdmin(c);
    if (!access.ok) {
      return access.response;
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = catalogQuestionWriteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid question" }, 400);
    }
    const saved = await questions.saveQuestion(
      toCatalogItem(parsed.data, access.user.id),
    );
    return c.json({ question: saved }, 201);
  });

  app.put("/api/admin/questions/:id", async (c) => {
    const access = await requireAdmin(c);
    if (!access.ok) {
      return access.response;
    }
    const idParsed = uuidSchema.safeParse(c.req.param("id"));
    if (!idParsed.success) {
      return c.json({ error: "invalid id" }, 400);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = catalogQuestionWriteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "invalid question" }, 400);
    }
    const saved = await questions.saveQuestion(
      toCatalogItem({ ...parsed.data, id: idParsed.data }, access.user.id),
    );
    return c.json({ question: saved });
  });

  return app;
}

export function accountRoleOf(value: string | undefined): AccountRole {
  return value !== undefined && isAccountRole(value) ? value : "user";
}
