import { useMemo, useState } from "react";
import { canWriteSet, type QuestionCatalogItem } from "@qwyzm/play-data";
import {
  DEFAULT_GENRE_PLAY_FILTER,
  isLocalQuestionSetId,
  type Genre,
  type GenrePlayFilter,
  type QuestionSet,
  type QuestionSetSource,
  type UserRole,
} from "@qwyzm/shared";
import { GenreFilterFields } from "../play/GenreFilterFields.tsx";

type Props = {
  role: UserRole;
  userId: string | null;
  sets: QuestionSet[];
  genres: Genre[];
  catalog: QuestionCatalogItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (set: QuestionSet) => Promise<QuestionSet>;
  onRemove: (id: string) => Promise<void>;
  createDraft: () => QuestionSet;
};

function canEdit(set: QuestionSet, role: UserRole, userId: string | null): boolean {
  if (role === "guest") {
    return isLocalQuestionSetId(set.id);
  }
  if (userId === null) {
    return false;
  }
  return canWriteSet(set, { id: userId, role: role === "admin" ? "admin" : "user" });
}

export function QuestionSetsScreen({
  role,
  userId,
  sets,
  genres,
  catalog,
  loading,
  error,
  onClose,
  onSave,
  onRemove,
  createDraft,
}: Props) {
  const [editing, setEditing] = useState<QuestionSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const official = sets.filter((set) => set.visibility === "official");
  const mine = sets.filter((set) => set.visibility !== "official");

  const startNew = () => {
    setFormError(null);
    setEditing(createDraft());
  };

  const save = async () => {
    if (editing === null) {
      return;
    }
    if (editing.name.trim().length === 0) {
      setFormError("名前を入力してください");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await onSave(editing);
      setEditing(null);
    } catch {
      setFormError("保存できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.4em] text-gold">QUESTION SETS</p>
          <h1 className="mt-2 font-serif text-4xl text-paper">問題セット</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {role === "guest"
              ? "未ログインのセットはこのブラウザだけに残ります。ログイン中のセットとは混ぜません。"
              : "ログイン中のセットはサーバーに保存されます。"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-3 py-1.5 text-xs tracking-widest text-paper"
        >
          戻る
        </button>
      </div>

      {error ? <p className="text-sm text-bad">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">読み込み中…</p> : null}

      {editing ? (
        <SetEditor
          set={editing}
          role={role}
          genres={genres}
          catalog={catalog}
          busy={busy}
          error={formError}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => void save()}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={startNew}
            className="self-start border border-gold px-6 py-2 text-sm tracking-[0.3em] text-gold"
          >
            新しいセット
          </button>
          <SetGroup
            title="公式"
            sets={official}
            role={role}
            userId={userId}
            onEdit={setEditing}
            onRemove={onRemove}
          />
          <SetGroup
            title={role === "guest" ? "このブラウザ" : "自分のセット"}
            sets={mine}
            role={role}
            userId={userId}
            onEdit={setEditing}
            onRemove={onRemove}
          />
        </>
      )}
    </div>
  );
}

function SetGroup({
  title,
  sets,
  role,
  userId,
  onEdit,
  onRemove,
}: {
  title: string;
  sets: QuestionSet[];
  role: UserRole;
  userId: string | null;
  onEdit: (set: QuestionSet) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] tracking-widest text-muted">{title}</h2>
      {sets.length === 0 ? (
        <p className="text-sm text-muted">まだありません</p>
      ) : (
        <ul className="space-y-2">
          {sets.map((set) => {
            const writable = canEdit(set, role, userId);
            return (
              <li key={set.id} className="flex items-center justify-between gap-3 border border-line px-3 py-2">
                <div>
                  <p className="text-sm text-paper">{set.name}</p>
                  <p className="text-[11px] text-muted">
                    {set.source === "filter" ? "ジャンル指定" : "問題を指定"}
                  </p>
                </div>
                {writable ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(set)}
                      className="border border-line px-2 py-1 text-[11px] tracking-widest text-paper"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRemove(set.id)}
                      className="border border-line px-2 py-1 text-[11px] tracking-widest text-muted"
                    >
                      削除
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">閲覧のみ</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SetEditor({
  set,
  role,
  genres,
  catalog,
  busy,
  error,
  onChange,
  onCancel,
  onSave,
}: {
  set: QuestionSet;
  role: UserRole;
  genres: Genre[];
  catalog: QuestionCatalogItem[];
  busy: boolean;
  error: string | null;
  onChange: (set: QuestionSet) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const patch = (partial: Partial<QuestionSet>) => onChange({ ...set, ...partial });
  const criteria: GenrePlayFilter = set.criteria ?? DEFAULT_GENRE_PLAY_FILTER;
  const selected = useMemo(() => new Set(set.questionIds), [set.questionIds]);

  return (
    <div className="flex flex-col gap-6">
      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">名前</span>
        <input
          value={set.name}
          onChange={(event) => patch({ name: event.target.value })}
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        />
      </label>

      {role === "admin" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={set.visibility === "official"}
            onChange={() =>
              patch({ visibility: set.visibility === "official" ? "private" : "official" })
            }
          />
          公式セット
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-[11px] tracking-widest text-muted">作り方</span>
        <select
          value={set.source}
          onChange={(event) => patch({ source: event.target.value as QuestionSetSource })}
          className="w-full border-b border-line bg-transparent py-2 text-lg outline-none"
        >
          <option value="filter" className="bg-panel text-paper">
            ジャンルで選ぶ
          </option>
          <option value="manual" className="bg-panel text-paper">
            問題を選ぶ
          </option>
        </select>
      </label>

      {set.source === "filter" ? (
        <GenreFilterFields
          genres={genres}
          filter={criteria}
          onChange={(next) => patch({ criteria: next })}
        />
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-[11px] tracking-widest text-muted">問題</legend>
          <div className="max-h-72 space-y-1 overflow-y-auto border border-line p-2">
            {catalog.map((question) => {
              const checked = selected.has(question.id);
              return (
                <label key={question.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        patch({
                          questionIds: set.questionIds.filter((id) => id !== question.id),
                        });
                        return;
                      }
                      patch({ questionIds: [...set.questionIds, question.id] });
                    }}
                  />
                  <span className="text-paper">{question.body.slice(0, 80)}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">{set.questionIds.length} 問</p>
        </fieldset>
      )}

      {error ? <p className="text-sm text-bad">{error}</p> : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="border border-gold px-6 py-2 text-sm tracking-[0.3em] text-gold disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-line px-6 py-2 text-sm tracking-[0.3em] text-paper"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
