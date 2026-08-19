import type { PlayRepository } from "@qwyzm/play-data";
import { createBrowserPlayRepository } from "./browser-repository.ts";
import { createHttpPlayRepository } from "./http-play-repository.ts";

export function createClientPlayRepository(userId: string | null): PlayRepository {
  return userId === null
    ? createBrowserPlayRepository()
    : createHttpPlayRepository({ baseUrl: "/api" });
}
