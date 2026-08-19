import type { PlayRepository, StoredGame } from "@qwyzm/play-data";

export function createHttpPlayRepository(options: {
  baseUrl: string;
}): PlayRepository {
  const base = options.baseUrl.replace(/\/$/, "");

  return {
    async listGames() {
      const response = await fetch(`${base}/games`, { credentials: "include" });
      if (response.status === 401) {
        throw new Error("unauthorized");
      }
      if (!response.ok) {
        throw new Error("failed to load games");
      }
      const body = (await response.json()) as { games: StoredGame[] };
      return body.games;
    },
    async saveGame(game: StoredGame) {
      const response = await fetch(`${base}/games`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });
      if (!response.ok) {
        throw new Error("failed to save game");
      }
    },
    async clear() {
      return;
    },
  };
}
