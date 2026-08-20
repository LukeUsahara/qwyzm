import type { Page } from "@playwright/test";

const STORAGE_KEY = "qwyzm.settings.v1";

const SMOKE_SETTINGS = {
  version: 1,
  ruleSet: {
    questionCount: 1,
    genreFilter: {
      allMain: true,
      selectedGenreIds: [],
      includeUnique: false,
      selectedUniqueGenreIds: [],
    },
    questionSetId: null,
    correctPoints: 1,
    missPenalty: "none",
    missPoints: 1,
    winCondition: "highest_after_n",
    targetPoints: 5,
    revealSpeed: "fast",
    wrongAnswerRule: "end_question",
    maxRereads: 1,
  },
  keyBind: { buzzCode: "Space" },
  volume: { master: 80, bgm: 50, se: 70 },
  showQuestionGenre: false,
};

export async function seedSmokeSettings(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: SMOKE_SETTINGS },
  );
}
