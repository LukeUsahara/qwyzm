import { execSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(root, "tests", "e2e", ".data");
const env = { ...process.env, PGLITE_DATA_DIR: dataDir };

mkdirSync(dataDir, { recursive: true });
execSync("pnpm --filter @qwyzm/db migrate", { env, stdio: "inherit", cwd: root, shell: true });
execSync("pnpm --filter @qwyzm/db seed", { env, stdio: "inherit", cwd: root, shell: true });
const child = spawn("pnpm --filter @qwyzm/api start", {
  env,
  stdio: "inherit",
  cwd: root,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
