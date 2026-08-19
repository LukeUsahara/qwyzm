import {
  childrenOf,
  mainGenres,
  mainSelectionState,
  toggleMainGenreSelection,
  uniqueGenres,
  type Genre,
  type GenrePlayFilter,
} from "@qwyzm/shared";
import { useState } from "react";

function genreButtonClass(state: "all" | "some" | "none"): string {
  if (state === "all") {
    return "border-gold text-gold";
  }
  if (state === "some") {
    return "border-gold/50 text-gold/80";
  }
  return "border-line text-muted";
}

function MainGenreTree({
  genres,
  filter,
  onToggle,
}: {
  genres: Genre[];
  filter: GenrePlayFilter;
  onToggle: (id: string) => void;
}) {
  const mains = mainGenres(genres);
  const roots = mains.filter((genre) => genre.parentId === null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggleOpen = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const render = (genre: Genre) => {
    const state = mainSelectionState(mains, filter, genre.id);
    const children = childrenOf(mains, genre.id);
    const open = openIds.has(genre.id);
    return (
      <div key={genre.id} className="space-y-2">
        <div className="flex items-stretch">
          {children.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? `${genre.name}を閉じる` : `${genre.name}を開く`}
              onClick={() => toggleOpen(genre.id)}
              className="border border-r-0 border-line px-2 text-xs text-muted"
            >
              {open ? "▼" : "▶"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onToggle(genre.id)}
            className={`border px-3 py-1.5 text-sm ${genreButtonClass(state)}`}
          >
            {genre.name}
          </button>
        </div>
        {children.length > 0 && open ? (
          <div className="ml-5 space-y-2 border-l border-line pl-3">
            {children.map((child) => render(child))}
          </div>
        ) : null}
      </div>
    );
  };

  return <div className="flex flex-col gap-2">{roots.map((root) => render(root))}</div>;
}

export function GenreFilterFields({
  genres,
  filter,
  onChange,
}: {
  genres: Genre[];
  filter: GenrePlayFilter;
  onChange: (filter: GenrePlayFilter) => void;
}) {
  const uniques = uniqueGenres(genres);

  return (
    <>
      <fieldset className="space-y-3">
        <legend className="text-[11px] tracking-widest text-muted">ジャンル</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filter.allMain}
            onChange={() =>
              onChange({
                ...filter,
                allMain: !filter.allMain,
                selectedGenreIds: [],
              })
            }
          />
          全て
        </label>
        <MainGenreTree
          genres={genres}
          filter={filter}
          onToggle={(id) => {
            const next = toggleMainGenreSelection(genres, filter, id);
            onChange({ ...filter, ...next });
          }}
        />
        <p className="text-[11px] text-muted">
          ▶ で下の分類を開きます。名前を押すとその括り（またはジャンル）の選択が切り替わります。
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[11px] tracking-widest text-muted">ユニークジャンル</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filter.includeUnique}
            onChange={() =>
              onChange({
                ...filter,
                includeUnique: !filter.includeUnique,
                selectedUniqueGenreIds: filter.includeUnique
                  ? []
                  : filter.selectedUniqueGenreIds,
              })
            }
          />
          ユニークジャンルを含める
        </label>
        {filter.includeUnique ? (
          <>
            <div className="flex flex-col gap-2">
              {uniques.map((genre) => {
                const allOn = filter.selectedUniqueGenreIds.length === 0;
                const active = allOn || filter.selectedUniqueGenreIds.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      const ids = uniques.map((item) => item.id);
                      const selected = new Set(
                        filter.selectedUniqueGenreIds.length === 0
                          ? ids
                          : filter.selectedUniqueGenreIds,
                      );
                      if (selected.has(genre.id)) {
                        selected.delete(genre.id);
                      } else {
                        selected.add(genre.id);
                      }
                      const next = ids.filter((id) => selected.has(id));
                      onChange({
                        ...filter,
                        selectedUniqueGenreIds: next.length === ids.length ? [] : next,
                      });
                    }}
                    className={`self-start border px-3 py-1.5 text-sm ${
                      active ? "border-gold text-gold" : "border-line text-muted"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted">
              チェック直後はすべて対象です。名前を押すとそのユニークジャンルだけ外れます。
            </p>
          </>
        ) : null}
      </fieldset>
    </>
  );
}
