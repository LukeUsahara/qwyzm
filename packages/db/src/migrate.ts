import path from "node:path";
import { fileURLToPath } from "node:url";

export const drizzleFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);
