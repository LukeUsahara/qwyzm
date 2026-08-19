import type {
  QuestionCatalogItem,
  QuestionListFilter,
  QuestionRepository,
} from "@qwyzm/play-data";
import type { Genre } from "@qwyzm/shared";

export function createHttpQuestionRepository(options: {
  baseUrl: string;
}): QuestionRepository {
  const base = options.baseUrl.replace(/\/$/, "");

  return {
    async listGenres() {
      const response = await fetch(`${base}/genres`);
      if (!response.ok) {
        throw new Error("failed to load genres");
      }
      const body = (await response.json()) as { genres: Genre[] };
      return body.genres;
    },

    async listQuestions(filter?: QuestionListFilter) {
      const params = new URLSearchParams();
      if (filter?.allMain === false) {
        params.set("allMain", "0");
      }
      if (filter?.genreIds && filter.genreIds.length > 0) {
        params.set("genreIds", [...filter.genreIds].join(","));
      }
      if (filter?.includeUnique) {
        params.set("includeUnique", "1");
      }
      if (filter?.uniqueGenreIds && filter.uniqueGenreIds.length > 0) {
        params.set("uniqueGenreIds", [...filter.uniqueGenreIds].join(","));
      }
      const query = params.toString();
      const response = await fetch(
        `${base}/questions${query.length > 0 ? `?${query}` : ""}`,
      );
      if (!response.ok) {
        throw new Error("failed to load questions");
      }
      const body = (await response.json()) as { questions: QuestionCatalogItem[] };
      return body.questions;
    },

    async getQuestion(id: string) {
      const response = await fetch(`${base}/questions/${id}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error("failed to load question");
      }
      const body = (await response.json()) as { question: QuestionCatalogItem };
      return body.question;
    },
    async saveQuestion() {
      throw new Error("use admin catalog to save questions");
    },
  };
}
