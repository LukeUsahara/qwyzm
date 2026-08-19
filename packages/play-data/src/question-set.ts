import {
  DEFAULT_GENRE_PLAY_FILTER,
  type Genre,
  type GenrePlayFilter,
  type QuestionSet,
} from "@qwyzm/shared";
import {
  filterCatalogByGenres,
  isOfficialQuestion,
} from "./question-repository.ts";
import type { QuestionCatalogItem } from "./types.ts";

export function resolveQuestionSetIds(params: {
  set: QuestionSet | null;
  genreFilter?: GenrePlayFilter;
  catalog: readonly QuestionCatalogItem[];
  genres: readonly Genre[];
}): string[] {
  const playable = params.catalog.filter(isOfficialQuestion);
  if (params.set === null) {
    return filterCatalogByGenres(
      playable,
      params.genres,
      params.genreFilter ?? DEFAULT_GENRE_PLAY_FILTER,
    ).map((question) => question.id);
  }
  if (params.set.source === "filter") {
    return filterCatalogByGenres(playable, params.genres, params.set.criteria).map(
      (question) => question.id,
    );
  }
  const allowed = new Set(playable.map((question) => question.id));
  return params.set.questionIds.filter((id) => allowed.has(id));
}

export function questionsFromResolvedIds(
  catalog: readonly QuestionCatalogItem[],
  ids: readonly string[],
): QuestionCatalogItem[] {
  const byId = new Map(catalog.map((question) => [question.id, question]));
  const resolved: QuestionCatalogItem[] = [];
  for (const id of ids) {
    const question = byId.get(id);
    if (question !== undefined) {
      resolved.push(question);
    }
  }
  return resolved;
}
