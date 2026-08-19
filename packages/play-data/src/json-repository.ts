import type { PlayDataDocument, StoredGame } from "./types.ts";
import type { PlayRepository } from "./repository.ts";
import { normalizeStoredGame } from "./map-from-engine.ts";

export const PLAY_DATA_STORAGE_KEY = "qwyzm.play-data.v1";

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function emptyDocument(): PlayDataDocument {
  return { version: 1, games: [] };
}

function parseDocument(raw: string | null): PlayDataDocument {
  if (raw === null || raw.length === 0) {
    return emptyDocument();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("games" in parsed)
    ) {
      return emptyDocument();
    }
    const doc = parsed as PlayDataDocument;
    if (doc.version !== 1 || !Array.isArray(doc.games)) {
      return emptyDocument();
    }
    return doc;
  } catch {
    return emptyDocument();
  }
}

export function createJsonPlayRepository(
  store: KeyValueStore,
  key = PLAY_DATA_STORAGE_KEY,
): PlayRepository {
  const read = (): PlayDataDocument => parseDocument(store.getItem(key));
  const write = (document: PlayDataDocument) => {
    store.setItem(key, JSON.stringify(document));
  };

  return {
    async listGames() {
      return [...read().games].map(normalizeStoredGame).sort((a, b) =>
        a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0,
      );
    },
    async saveGame(game: StoredGame) {
      const document = read();
      const next = document.games.filter((item) => item.id !== game.id);
      next.push(game);
      write({ version: 1, games: next });
    },
    async clear() {
      store.removeItem(key);
    },
  };
}

export function createMemoryKeyValueStore(
  initial: Record<string, string> = {},
): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}
