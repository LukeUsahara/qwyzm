import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema.ts";
import {
  createPostgresClient,
  createPostgresDb,
  databaseUrl,
  formatPostgresConnectError,
  type AppDb,
} from "./client.ts";
import { drizzleFolder } from "./migrate.ts";

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function pgliteDataDir(): string {
  return process.env.PGLITE_DATA_DIR ?? path.join(packageRoot, "data", "pglite");
}

export function usesPostgres(url = databaseUrl()): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export type CatalogDatabase = {
  kind: "pglite" | "postgres";
  db: AppDb;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
};

export async function openCatalogDatabase(url = databaseUrl()): Promise<CatalogDatabase> {
  if (usesPostgres(url)) {
    const client = createPostgresClient(url);
    const db = createPostgresDb(client);
    return {
      kind: "postgres",
      db,
      async migrate() {
        try {
          await migratePostgres(db, { migrationsFolder: drizzleFolder });
        } catch (error) {
          console.error(formatPostgresConnectError(error, url));
          throw error;
        }
      },
      async close() {
        await client.end();
      },
    };
  }

  const dataDir = pgliteDataDir();
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const raw = drizzlePglite(client, { schema });
  return {
    kind: "pglite",
    db: raw as unknown as AppDb,
    async migrate() {
      await migratePglite(raw, { migrationsFolder: drizzleFolder });
    },
    async close() {
      await client.close();
    },
  };
}
