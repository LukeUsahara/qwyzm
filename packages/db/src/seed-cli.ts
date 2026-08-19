import { seedCatalog } from "./seed.ts";
import { openCatalogDatabase } from "./runtime.ts";
import { databaseUrl, formatPostgresConnectError } from "./client.ts";

const catalog = await openCatalogDatabase();
try {
  await seedCatalog(catalog.db);
  console.log(catalog.kind === "pglite" ? "seeded PGlite" : "seeded PostgreSQL");
  if (catalog.kind === "pglite") {
    console.log("PGlite is in-process. Restart the API to load the new questions.");
  }
} catch (error) {
  if (catalog.kind === "postgres") {
    console.error(formatPostgresConnectError(error, databaseUrl()));
  }
  throw error;
} finally {
  await catalog.close();
}
