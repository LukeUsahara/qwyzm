export type GenreKind = "main" | "unique";

export type Genre = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  sortOrder: number;
  kind: GenreKind;
};

export type GenrePlayFilter = {
  /** When true, every main leaf is selected (「全て」). */
  allMain: boolean;
  /** Main leaf ids when allMain is false. Parent ids are expanded to leaves. */
  selectedGenreIds: readonly string[];
  includeUnique: boolean;
  /** Empty while includeUnique means every unique genre. */
  selectedUniqueGenreIds: readonly string[];
};

export function genreKindOf(genre: Genre): GenreKind {
  return genre.kind ?? "main";
}

export function mainGenres(genres: readonly Genre[]): Genre[] {
  return genres.filter((genre) => genreKindOf(genre) === "main");
}

export function uniqueGenres(genres: readonly Genre[]): Genre[] {
  return genres.filter((genre) => genreKindOf(genre) === "unique");
}

export function collectGenreSubtree(
  genres: Genre[],
  selectedIds: readonly string[],
): Set<string> {
  const allowed = new Set(selectedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const genre of genres) {
      if (
        genre.parentId !== null &&
        allowed.has(genre.parentId) &&
        !allowed.has(genre.id)
      ) {
        allowed.add(genre.id);
        changed = true;
      }
    }
  }
  return allowed;
}

export function descendantsOf(genres: readonly Genre[], id: string): string[] {
  return [...collectGenreSubtree([...genres], [id])].filter((item) => item !== id);
}

export function groupIds(genres: readonly Genre[], id: string): string[] {
  return [...collectGenreSubtree([...genres], [id])];
}

export function isLeafGenre(genres: readonly Genre[], id: string): boolean {
  return !genres.some((genre) => genre.parentId === id);
}

export function mainLeafIds(genres: readonly Genre[]): string[] {
  const main = mainGenres(genres);
  return main.filter((genre) => isLeafGenre(main, genre.id)).map((genre) => genre.id);
}

export function descendantLeafIds(genres: readonly Genre[], id: string): string[] {
  const main = mainGenres(genres);
  return groupIds(main, id).filter((item) => isLeafGenre(main, item));
}

export function childrenOf(genres: readonly Genre[], id: string): Genre[] {
  return genres.filter((genre) => genre.parentId === id);
}

export function rootGenreId(genres: Genre[], genreId: string): string {
  const byId = new Map(genres.map((genre) => [genre.id, genre]));
  let current = byId.get(genreId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (parent === undefined) {
      break;
    }
    current = parent;
  }
  return current?.id ?? genreId;
}

export function rootGenreIds(genres: Genre[], genreIds: readonly string[]): string[] {
  return [...new Set(genreIds.map((id) => rootGenreId(genres, id)))];
}

export function allowedGenreIdsForPlay(
  genres: readonly Genre[],
  filter: GenrePlayFilter,
): Set<string> {
  const allowed = new Set<string>();
  const leaves = mainLeafIds(genres);
  if (filter.allMain) {
    for (const id of leaves) {
      allowed.add(id);
    }
  } else {
    const leafSet = new Set(leaves);
    for (const id of filter.selectedGenreIds) {
      for (const leaf of descendantLeafIds(genres, id)) {
        if (leafSet.has(leaf)) {
          allowed.add(leaf);
        }
      }
    }
  }
  if (filter.includeUnique) {
    const unique = uniqueGenres(genres);
    const chosen = filter.selectedUniqueGenreIds;
    const source =
      chosen.length === 0
        ? unique
        : unique.filter((genre) => chosen.includes(genre.id));
    for (const genre of source) {
      allowed.add(genre.id);
    }
  }
  return allowed;
}

export function questionMatchesGenreFilter(
  genreIds: readonly string[],
  allowed: ReadonlySet<string>,
): boolean {
  return genreIds.some((id) => allowed.has(id));
}

export function toggleMainGenreSelection(
  genres: readonly Genre[],
  current: Pick<GenrePlayFilter, "allMain" | "selectedGenreIds">,
  clickedId: string,
): { allMain: boolean; selectedGenreIds: string[] } {
  const leaves = mainLeafIds(genres);
  const selected = new Set(
    current.allMain ? leaves : current.selectedGenreIds.filter((id) => leaves.includes(id)),
  );
  const group = descendantLeafIds(genres, clickedId);
  const allOn = group.length > 0 && group.every((id) => selected.has(id));
  if (allOn) {
    for (const id of group) {
      selected.delete(id);
    }
  } else {
    for (const id of group) {
      selected.add(id);
    }
  }
  const next = leaves.filter((id) => selected.has(id));
  const allMain = next.length === leaves.length && leaves.length > 0;
  return { allMain, selectedGenreIds: allMain ? [] : next };
}

export function mainSelectionState(
  genres: readonly Genre[],
  current: Pick<GenrePlayFilter, "allMain" | "selectedGenreIds">,
  id: string,
): "all" | "some" | "none" {
  const group = descendantLeafIds(genres, id);
  if (group.length === 0) {
    return "none";
  }
  const selected = new Set(current.allMain ? mainLeafIds(genres) : current.selectedGenreIds);
  const count = group.filter((item) => selected.has(item)).length;
  if (count === 0) {
    return "none";
  }
  if (count === group.length) {
    return "all";
  }
  return "some";
}

export const DEFAULT_GENRE_PLAY_FILTER: GenrePlayFilter = {
  allMain: true,
  selectedGenreIds: [],
  includeUnique: false,
  selectedUniqueGenreIds: [],
};
