import type { QuestionCatalogItem } from "@qwyzm/play-data";

export function createHttpAdminCatalog(options: { baseUrl: string }) {
  const base = options.baseUrl.replace(/\/$/, "");

  return {
    async listQuestions(): Promise<QuestionCatalogItem[]> {
      const response = await fetch(`${base}/admin/questions`, {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("管理者だけが編集できます");
      }
      if (!response.ok) {
        throw new Error("failed to load questions");
      }
      const body = (await response.json()) as { questions: QuestionCatalogItem[] };
      return body.questions;
    },
    async saveQuestion(item: QuestionCatalogItem): Promise<QuestionCatalogItem> {
      const isNew = item.id.length === 0;
      const payload = isNew ? { ...item, id: undefined } : item;
      const response = await fetch(
        isNew ? `${base}/admin/questions` : `${base}/admin/questions/${item.id}`,
        {
          method: isNew ? "POST" : "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("問題を保存できませんでした");
      }
      const body = (await response.json()) as { question: QuestionCatalogItem };
      return body.question;
    },
  };
}
