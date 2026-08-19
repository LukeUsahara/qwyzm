import type { AccountRole, QuestionSet } from "@qwyzm/shared";
import { isAdminRole } from "@qwyzm/shared";

export type QuestionSetActor = {
  id: string;
  role: AccountRole;
};

export interface QuestionSetRepository {
  listSets(actor: QuestionSetActor | null): Promise<QuestionSet[]>;
  getSet(id: string, actor: QuestionSetActor | null): Promise<QuestionSet | null>;
  saveSet(set: QuestionSet, actor: QuestionSetActor): Promise<QuestionSet>;
  deleteSet(id: string, actor: QuestionSetActor): Promise<boolean>;
}

export function canReadSet(set: QuestionSet, actor: QuestionSetActor | null): boolean {
  if (set.visibility === "official") {
    return true;
  }
  return actor !== null && set.ownerId === actor.id;
}

export function canWriteSet(set: QuestionSet, actor: QuestionSetActor): boolean {
  if (set.visibility === "official") {
    return isAdminRole(actor.role);
  }
  return set.ownerId === actor.id;
}

export function createMemoryQuestionSetRepository(
  initial: readonly QuestionSet[] = [],
): QuestionSetRepository {
  const sets = new Map(initial.map((set) => [set.id, structuredClone(set)]));

  return {
    async listSets(actor) {
      return [...sets.values()]
        .filter((set) => canReadSet(set, actor))
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    },
    async getSet(id, actor) {
      const set = sets.get(id);
      if (set === undefined || !canReadSet(set, actor)) {
        return null;
      }
      return structuredClone(set);
    },
    async saveSet(input, actor) {
      const existing = sets.get(input.id);
      if (existing && !canWriteSet(existing, actor)) {
        throw new Error("forbidden");
      }
      if (input.visibility === "official" && !isAdminRole(actor.role)) {
        throw new Error("forbidden");
      }
      const next: QuestionSet = {
        ...structuredClone(input),
        ownerId: input.visibility === "official" ? null : (existing?.ownerId ?? actor.id),
        updatedAt: new Date().toISOString(),
      };
      sets.set(next.id, next);
      return structuredClone(next);
    },
    async deleteSet(id, actor) {
      const existing = sets.get(id);
      if (existing === undefined) {
        return false;
      }
      if (!canWriteSet(existing, actor)) {
        throw new Error("forbidden");
      }
      return sets.delete(id);
    },
  };
}
