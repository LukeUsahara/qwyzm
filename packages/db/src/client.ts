import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

/** File-backed PGlite. Override with postgres://... to use a real server. */
export const DEFAULT_DATABASE_URL = "pglite";

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function createPostgresClient(url = databaseUrl()) {
  return postgres(url, { max: 1 });
}

export function createPostgresDb(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema });
}

export type AppDb = ReturnType<typeof createPostgresDb>;

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  if ("cause" in error) {
    return errorCode(error.cause);
  }
  return undefined;
}

export function formatPostgresConnectError(error: unknown, url = databaseUrl()): string {
  const code = errorCode(error);
  const lines = [`PostgreSQL に接続できませんでした: ${url}`];
  if (code === "28P01") {
    lines.push(
      "パスワード認証に失敗しています。このポートには別の PostgreSQL が既にいる可能性が高いです。",
      "手元開発は Docker なしでもできます: DATABASE_URL を外して `pnpm db:migrate`（既定は PGlite）。",
      "Docker を使う場合は Desktop を起動し、docker-compose の 5434 番を使ってください。",
    );
  } else if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    lines.push(
      "指定した PostgreSQL に届いていません。",
      "Docker を使うなら Desktop を起動して `docker compose up -d`。",
      "使わないなら DATABASE_URL を設定せず、PGlite のまま `pnpm db:migrate` してください。",
    );
  } else {
    lines.push(
      "DATABASE_URL を確認してください。未設定なら PGlite を使います。",
    );
  }
  return lines.join("\n");
}
