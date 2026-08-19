import type { QuestionCatalogItem } from "@qwyzm/play-data";
import type { QuestionSet } from "@qwyzm/shared";

export function createHttpQuestionSetClient(options: { baseUrl: string }): {
  list(): Promise<QuestionSet[]>;
  get(id: string): Promise<QuestionSet | null>;
  save(set: Omit<QuestionSet, "ownerId" | "createdAt" | "updatedAt"> & { id?: string }): Promise<QuestionSet>;
  remove(id: string): Promise<boolean>;
  questions(id: string): Promise<QuestionCatalogItem[]>;
} {
  const base = options.baseUrl.replace(/\/$/, "");

  return {
    async list() {
      const response = await fetch(`${base}/question-sets`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("failed to load sets");
      }
      const body = (await response.json()) as { sets: QuestionSet[] };
      return body.sets;
    },
    async get(id) {
      const response = await fetch(`${base}/question-sets/${id}`, { credentials: "include" });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error("failed to load set");
      }
      const body = (await response.json()) as { set: QuestionSet };
      return body.set;
    },
    async save(set) {
      const payload = {
        id: set.id,
        name: set.name,
        visibility: set.visibility,
        source: set.source,
        criteria: set.criteria,
        questionIds: set.questionIds,
      };
      const response = await fetch(`${base}/question-sets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        throw new Error("unauthorized");
      }
      if (response.status === 403) {
        throw new Error("forbidden");
      }
      if (!response.ok) {
        throw new Error("failed to save set");
      }
      const body = (await response.json()) as { set: QuestionSet };
      return body.set;
    },
    async remove(id) {
      const response = await fetch(`${base}/question-sets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 404) {
        return false;
      }
      if (!response.ok) {
        throw new Error("failed to delete set");
      }
      return true;
    },
    async questions(id) {
      const response = await fetch(`${base}/question-sets/${id}/questions`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("failed to resolve set");
      }
      const body = (await response.json()) as { questions: QuestionCatalogItem[] };
      return body.questions;
    },
  };
}
