import { openCatalogDatabase, databaseUrl, formatPostgresConnectError } from "@qwyzm/db";
import { hashAndSeedAdmin } from "./seed-admin.ts";

const catalog = await openCatalogDatabase();
try {
  await hashAndSeedAdmin(catalog.db);
  console.log("seeded admin user");
} catch (error) {
  if (catalog.kind === "postgres") {
    console.error(formatPostgresConnectError(error, databaseUrl()));
  }
  throw error;
} finally {
  await catalog.close();
}
