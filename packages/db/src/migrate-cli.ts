import { openCatalogDatabase } from "./runtime.ts";

const catalog = await openCatalogDatabase();
try {
  await catalog.migrate();
  if (catalog.kind === "pglite") {
    console.log("migrated PGlite");
  } else {
    console.log("migrated PostgreSQL");
  }
} finally {
  await catalog.close();
}
