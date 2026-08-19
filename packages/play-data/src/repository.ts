import type { StoredGame } from "./types.ts";

export interface PlayRepository {
  listGames(): Promise<StoredGame[]>;
  saveGame(game: StoredGame): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryPlayRepository(
  initial: StoredGame[] = [],
): PlayRepository {
  const games = new Map(initial.map((game) => [game.id, game]));
  return {
    async listGames() {
      return [...games.values()].sort((a, b) =>
        a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0,
      );
    },
    async saveGame(game) {
      games.set(game.id, structuredClone(game));
    },
    async clear() {
      games.clear();
    },
  };
}
