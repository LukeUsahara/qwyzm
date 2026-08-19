import type { AnswerSpec } from "@qwyzm/game-core";

export type NamedAnswer = {
  displayText: string;
  inputText: string;
  silentInputs: string[];
};

export function emptyNamedAnswer(): NamedAnswer {
  return { displayText: "", inputText: "", silentInputs: [] };
}

export function namedAnswer(
  displayText: string,
  inputText: string,
  silentInputs: string[] = [],
): NamedAnswer {
  return { displayText, inputText, silentInputs };
}

export function flattenCatalogAnswers(item: {
  primary: NamedAnswer;
  alternates: readonly NamedAnswer[];
  closeInputs: readonly string[];
}): { answers: AnswerSpec[]; closeAnswers: AnswerSpec[] } {
  const answers: AnswerSpec[] = [
    {
      displayText: item.primary.displayText,
      normalizedText: item.primary.inputText,
      reveal: "primary",
    },
    ...item.primary.silentInputs.map((input) => ({
      displayText: item.primary.displayText,
      normalizedText: input,
      reveal: "silent" as const,
    })),
  ];
  for (const alternate of item.alternates) {
    answers.push({
      displayText: alternate.displayText,
      normalizedText: alternate.inputText,
      reveal: "alternate",
    });
    for (const input of alternate.silentInputs) {
      answers.push({
        displayText: alternate.displayText,
        normalizedText: input,
        reveal: "alternate",
      });
    }
  }
  return {
    answers,
    closeAnswers: item.closeInputs.map((input) => ({
      displayText: input,
      normalizedText: input,
    })),
  };
}

export function catalogAnswersFromRows(
  correct: readonly {
    displayText: string;
    normalizedText: string;
    reveal: "primary" | "silent" | "alternate";
    sortOrder: number;
  }[],
  close: readonly { normalizedText: string }[],
): {
  primary: NamedAnswer;
  alternates: NamedAnswer[];
  closeInputs: string[];
} {
  const ordered = [...correct].sort((a, b) => a.sortOrder - b.sortOrder);
  let primary: NamedAnswer | null = null;
  const alternates: NamedAnswer[] = [];
  let current: NamedAnswer | null = null;

  for (const row of ordered) {
    if (row.reveal === "alternate") {
      current = namedAnswer(row.displayText, row.normalizedText);
      alternates.push(current);
      continue;
    }
    if (row.reveal === "primary" || primary === null) {
      current = namedAnswer(
        row.displayText.length > 0 ? row.displayText : row.normalizedText,
        row.normalizedText,
      );
      primary = current;
      continue;
    }
    current?.silentInputs.push(row.normalizedText);
  }

  return {
    primary: primary ?? emptyNamedAnswer(),
    alternates,
    closeInputs: close.map((row) => row.normalizedText),
  };
}
