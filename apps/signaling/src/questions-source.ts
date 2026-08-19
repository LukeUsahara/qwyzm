import type { Question } from "@qwyzm/game-core";
import type { RuleSet } from "@qwyzm/shared";

const DEV_INTERNAL_TOKEN = "qwyzm-dev-internal";

export type PlayQuestionsLoader = (ruleSet: RuleSet, seed: string) => Promise<Question[]>;

export function createHttpPlayQuestionsLoader(options: {
  apiBaseUrl: string;
  token: string;
}): PlayQuestionsLoader {
  return async (ruleSet, seed) => {
    const response = await fetch(`${options.apiBaseUrl.replace(/\/$/, "")}/internal/play-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": options.token,
      },
      body: JSON.stringify({
        questionSetId: ruleSet.questionSetId,
        genreFilter: {
          allMain: ruleSet.genreFilter.allMain,
          selectedGenreIds: [...ruleSet.genreFilter.selectedGenreIds],
          includeUnique: ruleSet.genreFilter.includeUnique,
          selectedUniqueGenreIds: [...ruleSet.genreFilter.selectedUniqueGenreIds],
        },
        count: ruleSet.questionCount,
        seed,
      }),
    });
    if (!response.ok) {
      throw new Error("questions_unavailable");
    }
    const body = (await response.json()) as { questions: Question[] };
    if (!Array.isArray(body.questions) || body.questions.length < 1) {
      throw new Error("questions_unavailable");
    }
    return body.questions;
  };
}

export function defaultPlayQuestionsLoader(): PlayQuestionsLoader {
  return createHttpPlayQuestionsLoader({
    apiBaseUrl: process.env.API_BASE_URL ?? "http://127.0.0.1:8787",
    token: process.env.INTERNAL_TOKEN ?? DEV_INTERNAL_TOKEN,
  });
}
