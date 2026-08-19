import type { QuestionSet } from "@qwyzm/shared";
import { QUESTION_SET_STORAGE_KEY } from "@qwyzm/shared";
import type { KeyValueStore } from "./json-repository.ts";

export type QuestionSetDocument = {
  version: 1;
  sets: QuestionSet[];
};

function emptyDocument(): QuestionSetDocument {
  return { version: 1, sets: [] };
}

function parseDocument(raw: string | null): QuestionSetDocument {
  if (raw === null || raw.length === 0) {
    return emptyDocument();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("sets" in parsed)
    ) {
      return emptyDocument();
    }
    const doc = parsed as QuestionSetDocument;
    if (doc.version !== 1 || !Array.isArray(doc.sets)) {
      return emptyDocument();
    }
    return doc;
  } catch {
    return emptyDocument();
  }
}

export function createJsonQuestionSetStore(storage: KeyValueStore): {
  list(): QuestionSet[];
  get(id: string): QuestionSet | null;
  save(set: QuestionSet): QuestionSet;
  remove(id: string): boolean;
} {
  const read = () => parseDocument(storage.getItem(QUESTION_SET_STORAGE_KEY));
  const write = (doc: QuestionSetDocument) => {
    storage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(doc));
  };

  return {
    list() {
      return [...read().sets].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    },
    get(id) {
      return read().sets.find((set) => set.id === id) ?? null;
    },
    save(set) {
      const doc = read();
      const index = doc.sets.findIndex((item) => item.id === set.id);
      const stored = { ...set, updatedAt: new Date().toISOString() };
      if (index === -1) {
        doc.sets.push(stored);
      } else {
        doc.sets[index] = stored;
      }
      write(doc);
      return stored;
    },
    remove(id) {
      const doc = read();
      const next = doc.sets.filter((set) => set.id !== id);
      if (next.length === doc.sets.length) {
        return false;
      }
      write({ version: 1, sets: next });
      return true;
    },
  };
}
