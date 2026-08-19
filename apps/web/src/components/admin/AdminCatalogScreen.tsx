import { useEffect, useMemo, useState } from "react";
import type { NamedAnswer, QuestionCatalogItem, QuestionStatus } from "@qwyzm/play-data";
import { collectGenreSubtree, childrenOf, mainGenres, uniqueGenres, type Genre } from "@qwyzm/shared";
import { createHttpAdminCatalog } from "../../catalog/http-admin-catalog.ts";

type ListSort = "id" | "body" | "answer" | "genre" | "status";

type NamedDraft = {
  displayText: string;
  inputText: string;
  silentInputs: string[];
};

type FormState = {
  id: string;
  body: string;
  status: Exclude<QuestionStatus, "user">;
  genreIds: string[];
  primary: NamedDraft;
  alternates: NamedDraft[];
  closeInputs: string[];
};

function emptyNamed(): NamedDraft {
  return { displayText: "", inputText: "", silentInputs: [] };
}

function emptyForm(): FormState {
  return {
    id: "",
    body: "",
    status: "official",
    genreIds: [],
    primary: emptyNamed(),
    alternates: [],
    closeInputs: [],
  };
}

function fromNamed(named: NamedAnswer): NamedDraft {
  return {
    displayText: named.displayText,
    inputText: named.inputText,
    silentInputs: named.silentInputs.length > 0 ? [...named.silentInputs] : [""],
  };
}

function toNamed(draft: NamedDraft): NamedAnswer {
  return {
    displayText: draft.displayText.trim(),
    inputText: draft.inputText.trim(),
    silentInputs: draft.silentInputs.map((input) => input.trim()).filter((input) => input.length > 0),
  };
}

function fromItem(item: QuestionCatalogItem): FormState {
  return {
    id: item.id,
    body: item.body,
    status: item.status === "draft" ? "draft" : "official",
    genreIds: [...item.genreIds],
    primary: fromNamed(item.primary),
    alternates: item.alternates.map(fromNamed),
    closeInputs: item.closeInputs.length > 0 ? [...item.closeInputs] : [""],
  };
}

function toItem(form: FormState): QuestionCatalogItem {
  return {
    id: form.id,
    body: form.body.trim(),
    status: form.status,
    genreIds: form.genreIds,
    primary: toNamed(form.primary),
    alternates: form.alternates
      .filter(
        (alternate) =>
          alternate.displayText.trim().length > 0 || alternate.inputText.trim().length > 0,
      )
      .map(toNamed),
    closeInputs: form.closeInputs.map((input) => input.trim()).filter((input) => input.length > 0),
  };
}

type Props = {
  genres: Genre[];
  onClose: () => void;
  onChanged: () => void;
};

export function AdminCatalogScreen({ genres, onClose, onChanged }: Props) {
  const catalog = useMemo(() => createHttpAdminCatalog({ baseUrl: "/api" }), []);
  const [questions, setQuestions] = useState<QuestionCatalogItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [sort, setSort] = useState<ListSort>("id");

  const load = async () => {
    const list = await catalog.listQuestions();
    setQuestions(list);
  };

  useEffect(() => {
    void load().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "読み込みに失敗しました");
    });
  }, [catalog]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await catalog.saveQuestion(toItem(form));
      setForm(fromItem(saved));
      await load();
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const listed = useMemo(
    () => filterAndSortQuestions(questions, genres, query, genreFilter, sort),
    [questions, genres, query, genreFilter, sort],
  );

  return (
    <div className="flex h-full min-h-0 gap-5">
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex shrink-0 items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.4em] text-gold">OFFICIAL</p>
            <h1 className="mt-1 font-serif text-2xl">公式問題</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs tracking-widest text-muted"
          >
            戻る
          </button>
        </header>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="問題文・答えで検索"
            className="min-w-48 flex-1 border border-line bg-transparent px-3 py-1.5 text-sm outline-none"
          />
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className="border border-line bg-ink px-2 py-1.5 text-sm"
          >
            <option value="">すべてのジャンル</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genreOptionLabel(genre, genres)}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ListSort)}
            className="border border-line bg-ink px-2 py-1.5 text-sm"
          >
            <option value="id">追加順</option>
            <option value="body">問題文</option>
            <option value="answer">答え</option>
            <option value="genre">ジャンル</option>
            <option value="status">公開状態</option>
          </select>
          <button
            type="button"
            onClick={() => setForm(emptyForm())}
            className="border border-gold px-3 py-1.5 text-xs tracking-widest text-gold"
          >
            新規作成
          </button>
        </div>
        <p className="shrink-0 text-[11px] text-muted">
          {listed.length} / {questions.length} 問
        </p>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {listed.map((question) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => setForm(fromItem(question))}
                className={`w-full border px-3 py-2 text-left ${
                  form.id === question.id
                    ? "border-gold text-gold"
                    : "border-line text-paper"
                }`}
              >
                <span className="block text-[11px] tracking-widest text-muted">
                  [{genreLabel(question.genreIds, genres)}]
                  {question.status === "draft" ? " 下書き" : ""}
                </span>
                <span className="mt-1 block truncate text-sm">{question.body}</span>
                <span className="mt-1 block truncate text-[11px] text-muted">
                  答え：{question.primary.displayText.length > 0
                    ? question.primary.displayText
                    : "未設定"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form
        className="w-[26rem] shrink-0 space-y-5 overflow-y-auto lg:w-[28rem]"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">問題文</span>
          <textarea
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            rows={4}
            className="w-full border border-line bg-transparent px-3 py-2 text-base outline-none"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">公開</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value === "draft" ? "draft" : "official",
              })
            }
            className="border border-line bg-ink px-3 py-2 text-sm"
          >
            <option value="official">公式（出題する）</option>
            <option value="draft">下書き</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[11px] tracking-widest text-muted">ジャンル</legend>
          <AdminMainGenreTree
            genres={genres}
            selected={form.genreIds}
            onChange={(genreIds) => setForm({ ...form, genreIds })}
          />
        </fieldset>

        <label className="block space-y-2">
          <span className="text-[11px] tracking-widest text-muted">ユニークジャンル</span>
          <select
            multiple
            value={form.genreIds.filter((id) => uniqueGenres(genres).some((genre) => genre.id === id))}
            onChange={(event) => {
              const selectedUnique = [...event.target.selectedOptions].map((option) => option.value);
              const uniqueIds = new Set(uniqueGenres(genres).map((genre) => genre.id));
              const withoutUnique = form.genreIds.filter((id) => !uniqueIds.has(id));
              setForm({ ...form, genreIds: [...withoutUnique, ...selectedUnique] });
            }}
            className="min-h-28 w-full border border-line bg-ink px-3 py-2 text-sm"
          >
            {uniqueGenres(genres).map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted">Ctrl や Cmd で複数選択できます。</p>
        </label>

        <NamedAnswerEditor
          title="想定解"
          named={form.primary}
          required
          onChange={(primary) => setForm({ ...form, primary })}
        />

        <fieldset className="space-y-4">
          <legend className="text-[11px] tracking-widest text-muted">別称</legend>
          {form.alternates.map((alternate, index) => (
            <NamedAnswerEditor
              key={index}
              title={`別称 ${index + 1}`}
              named={alternate}
              onChange={(next) => {
                const alternates = [...form.alternates];
                alternates[index] = next;
                setForm({ ...form, alternates });
              }}
              onRemove={() =>
                setForm({
                  ...form,
                  alternates: form.alternates.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            />
          ))}
          <button
            type="button"
            onClick={() => setForm({ ...form, alternates: [...form.alternates, emptyNamed()] })}
            className="text-xs tracking-widest text-gold"
          >
            別称を足す
          </button>
        </fieldset>

        <InputListEditor
          title="惜しい解答"
          values={form.closeInputs}
          placeholder="入力解のみ"
          onChange={(closeInputs) => setForm({ ...form, closeInputs })}
        />

        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="border border-gold px-4 py-2 text-xs tracking-widest text-gold disabled:opacity-50"
        >
          保存する
        </button>
      </form>
    </div>
  );
}

function NamedAnswerEditor(props: {
  title: string;
  named: NamedDraft;
  required?: boolean;
  onChange: (named: NamedDraft) => void;
  onRemove?: () => void;
}) {
  return (
    <fieldset className="space-y-3 border border-line px-3 py-3">
      <legend className="px-1 text-[11px] tracking-widest text-muted">{props.title}</legend>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          value={props.named.displayText}
          onChange={(event) =>
            props.onChange({ ...props.named, displayText: event.target.value })
          }
          placeholder="表示解"
          required={props.required}
          className="border-b border-line bg-transparent py-1 text-sm outline-none"
        />
        <input
          value={props.named.inputText}
          onChange={(event) =>
            props.onChange({ ...props.named, inputText: event.target.value })
          }
          placeholder="入力解（ひらがな / 英数字）"
          required={props.required}
          className="border-b border-line bg-transparent py-1 text-sm outline-none"
        />
        {props.onRemove ? (
          <button type="button" onClick={props.onRemove} className="text-xs text-muted">
            削除
          </button>
        ) : (
          <span />
        )}
      </div>
      <InputListEditor
        title="判定のみ"
        values={props.named.silentInputs}
        placeholder="入力解のみ"
        onChange={(silentInputs) => props.onChange({ ...props.named, silentInputs })}
      />
    </fieldset>
  );
}

function InputListEditor(props: {
  title: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const values = props.values.length > 0 ? props.values : [""];
  return (
    <div className="space-y-2">
      <p className="text-[11px] tracking-widest text-muted">{props.title}</p>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={value}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              props.onChange(next);
            }}
            placeholder={props.placeholder}
            className="flex-1 border-b border-line bg-transparent py-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => props.onChange(values.filter((_, itemIndex) => itemIndex !== index))}
            className="text-xs text-muted"
          >
            削除
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => props.onChange([...values, ""])}
        className="text-xs tracking-widest text-gold"
      >
        {props.title}を足す
      </button>
    </div>
  );
}

function AdminMainGenreTree({
  genres,
  selected,
  onChange,
}: {
  genres: readonly Genre[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const mains = mainGenres(genres);
  const roots = mains.filter((genre) => genre.parentId === null);
  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    );
  };
  const render = (genre: Genre, depth: number) => {
    const children = childrenOf(mains, genre.id);
    if (children.length === 0) {
      return (
        <label
          key={genre.id}
          className="flex items-center gap-2 text-sm"
          style={{ marginLeft: depth * 12 }}
        >
          <input
            type="checkbox"
            checked={selected.includes(genre.id)}
            onChange={() => toggle(genre.id)}
          />
          {genre.name}
        </label>
      );
    }
    return (
      <div key={genre.id} className="space-y-1" style={{ marginLeft: depth * 12 }}>
        <p className="text-[11px] tracking-widest text-muted">{genre.name}</p>
        {children.map((child) => render(child, depth + 1))}
      </div>
    );
  };
  return <div className="space-y-2">{roots.map((root) => render(root, 0))}</div>;
}

function genreDepth(genre: Genre, genres: readonly Genre[]): number {
  const byId = new Map(genres.map((item) => [item.id, item]));
  let depth = 0;
  let current = genre;
  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (parent === undefined) {
      break;
    }
    depth += 1;
    current = parent;
  }
  return depth;
}

function genreOptionLabel(genre: Genre, genres: readonly Genre[]): string {
  const depth = genreDepth(genre, genres);
  if (depth === 0) {
    return genre.name;
  }
  return `${"　".repeat(depth - 1)}└ ${genre.name}`;
}

function genreLabel(genreIds: readonly string[], genres: readonly Genre[]): string {
  const byId = new Map(genres.map((genre) => [genre.id, genre]));
  const selected = new Set(genreIds);
  const names = genreIds
    .filter((id) => {
      const genre = byId.get(id);
      if (genre === undefined) {
        return false;
      }
      return !genres.some(
        (other) => selected.has(other.id) && other.parentId === id,
      );
    })
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => name !== undefined && name.length > 0);
  return names.length > 0 ? names.join("・") : "未分類";
}

function matchesQuery(question: QuestionCatalogItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  const haystack = [
    question.body,
    question.primary.displayText,
    question.primary.inputText,
    ...question.primary.silentInputs,
    ...question.alternates.flatMap((alternate) => [
      alternate.displayText,
      alternate.inputText,
      ...alternate.silentInputs,
    ]),
    ...question.closeInputs,
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

function filterAndSortQuestions(
  questions: readonly QuestionCatalogItem[],
  genres: readonly Genre[],
  query: string,
  genreFilter: string,
  sort: ListSort,
): QuestionCatalogItem[] {
  const allowed =
    genreFilter.length === 0
      ? null
      : collectGenreSubtree([...genres], [genreFilter]);
  const filtered = questions.filter((question) => {
    if (!matchesQuery(question, query)) {
      return false;
    }
    if (allowed === null) {
      return true;
    }
    return question.genreIds.some((id) => allowed.has(id));
  });
  const collator = new Intl.Collator("ja");
  return [...filtered].sort((left, right) => {
    if (sort === "body") {
      return collator.compare(left.body, right.body);
    }
    if (sort === "answer") {
      return collator.compare(left.primary.displayText, right.primary.displayText);
    }
    if (sort === "genre") {
      return collator.compare(
        genreLabel(left.genreIds, genres),
        genreLabel(right.genreIds, genres),
      );
    }
    if (sort === "status") {
      return (left.status ?? "official").localeCompare(right.status ?? "official");
    }
    return left.id.localeCompare(right.id);
  });
}

