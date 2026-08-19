import { useCallback, useEffect, useMemo, useState } from "react";
import { createJsonQuestionSetStore, createMemoryKeyValueStore } from "@qwyzm/play-data";
import {
  emptyQuestionSet,
  isLocalQuestionSetId,
  newLocalQuestionSetId,
  type QuestionSet,
  type UserRole,
} from "@qwyzm/shared";
import { createHttpQuestionSetClient } from "../catalog/http-question-set-client.ts";

function browserStore() {
  if (typeof localStorage === "undefined") {
    return createMemoryKeyValueStore();
  }
  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    },
  };
}

export function useQuestionSets(role: UserRole): {
  sets: QuestionSet[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  save: (set: QuestionSet) => Promise<QuestionSet>;
  remove: (id: string) => Promise<void>;
  createDraft: () => QuestionSet;
} {
  const authenticated = role !== "guest";
  const http = useMemo(() => createHttpQuestionSetClient({ baseUrl: "/api" }), []);
  const local = useMemo(() => createJsonQuestionSetStore(browserStore()), []);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const remote = await http.list();
        const localSets = authenticated ? [] : local.list();
        const merged = new Map<string, QuestionSet>();
        for (const set of remote) {
          merged.set(set.id, set);
        }
        for (const set of localSets) {
          merged.set(set.id, set);
        }
        if (!cancelled) {
          setSets(
            [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "ja")),
          );
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setSets(authenticated ? [] : local.list());
          setError("問題セットを取得できませんでした");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, http, local, token]);

  return {
    sets,
    loading,
    error,
    reload,
    createDraft: () =>
      emptyQuestionSet({
        id: authenticated ? crypto.randomUUID() : newLocalQuestionSetId(),
        name: "新しいセット",
        visibility: "private",
        source: "filter",
      }),
    save: async (set) => {
      if (!authenticated) {
        if (!isLocalQuestionSetId(set.id) || set.visibility === "official") {
          throw new Error("forbidden");
        }
        const saved = local.save(set);
        reload();
        return saved;
      }
      if (isLocalQuestionSetId(set.id)) {
        throw new Error("forbidden");
      }
      const saved = await http.save(set);
      reload();
      return saved;
    },
    remove: async (id) => {
      if (!authenticated) {
        if (!isLocalQuestionSetId(id)) {
          throw new Error("forbidden");
        }
        local.remove(id);
        reload();
        return;
      }
      await http.remove(id);
      reload();
    },
  };
}
