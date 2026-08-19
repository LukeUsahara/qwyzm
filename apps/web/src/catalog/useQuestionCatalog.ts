import { useEffect, useState } from "react";
import type { QuestionCatalogItem, QuestionRepository } from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";

const FULL_CATALOG = { allMain: true, includeUnique: true } as const;

export function useQuestionCatalog(repo: QuestionRepository): {
  genres: Genre[];
  questions: QuestionCatalogItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [questions, setQuestions] = useState<QuestionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [nextGenres, nextQuestions] = await Promise.all([
          repo.listGenres(),
          repo.listQuestions(FULL_CATALOG),
        ]);
        if (cancelled) {
          return;
        }
        setGenres(nextGenres);
        setQuestions(nextQuestions);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("問題データを取得できませんでした");
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
  }, [repo, reloadToken]);

  return {
    genres,
    questions,
    loading,
    error,
    reload: () => setReloadToken((token) => token + 1),
  };
}
