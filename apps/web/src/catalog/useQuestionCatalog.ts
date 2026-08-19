import { useEffect, useMemo, useState } from "react";
import type { QuestionCatalogItem, QuestionListFilter, QuestionRepository } from "@qwyzm/play-data";
import type { Genre, GenrePlayFilter } from "@qwyzm/shared";

export function useQuestionCatalog(
  repo: QuestionRepository,
  filter: GenrePlayFilter,
): {
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
  const listFilter: QuestionListFilter = useMemo(
    () => ({
      allMain: filter.allMain,
      genreIds: filter.selectedGenreIds,
      includeUnique: filter.includeUnique,
      uniqueGenreIds: filter.selectedUniqueGenreIds,
    }),
    [
      filter.allMain,
      filter.includeUnique,
      filter.selectedGenreIds,
      filter.selectedUniqueGenreIds,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [nextGenres, nextQuestions] = await Promise.all([
          repo.listGenres(),
          repo.listQuestions(listFilter),
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
  }, [repo, listFilter, reloadToken]);

  return {
    genres,
    questions,
    loading,
    error,
    reload: () => setReloadToken((token) => token + 1),
  };
}
