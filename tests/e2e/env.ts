import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const E2E_API_PORT = "18787";
export const E2E_SIGNALING_PORT = "18788";
export const E2E_WEB_PORT = "4173";
export const E2E_DATA_DIR = path.join(root, "tests", "e2e", ".data");

export function e2eEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.PGLITE_DATA_DIR = E2E_DATA_DIR;
  env.API_PORT = E2E_API_PORT;
  env.SIGNALING_PORT = E2E_SIGNALING_PORT;
  env.API_BASE_URL = `http://127.0.0.1:${E2E_API_PORT}`;
  env.WEB_PORT = E2E_WEB_PORT;
  env.API_PROXY_TARGET = `http://127.0.0.1:${E2E_API_PORT}`;
  env.WS_PROXY_TARGET = `ws://127.0.0.1:${E2E_SIGNALING_PORT}`;
  return env;
}
