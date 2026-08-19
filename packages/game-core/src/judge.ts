import { CLOSE_LIMIT } from "@qwyzm/shared";
import { normalizeForJudge } from "./normalize.ts";
import type { AnswerSpec, Question } from "./types.ts";

export type JudgeResult = "correct" | "close" | "wrong";

export function canonicalAnswer(answer: AnswerSpec): string {
  return normalizeForJudge(answer.normalizedText ?? answer.displayText);
}

export function primaryAnswer(question: Question): AnswerSpec | undefined {
  return (
    question.answers.find((answer) => answer.reveal === "primary") ??
    question.answers[0]
  );
}

/**
 * One line for the result screen.
 * Distinct alternate names are shown only when the player used that form.
 */
export function formatResultAnswer(
  question: Question,
  submitted: string | null,
): string {
  const primary = primaryAnswer(question);
  if (primary === undefined) {
    return "";
  }
  if (submitted === null || submitted.length === 0) {
    return primary.displayText;
  }
  const normalized = normalizeForJudge(submitted);
  const matched = question.answers.find(
    (answer) => canonicalAnswer(answer) === normalized,
  );
  if (matched !== undefined && matched.reveal === "alternate") {
    return `${primary.displayText}（${matched.displayText}）`;
  }
  return primary.displayText;
}

export function judgeAnswer(input: string, question: Question): JudgeResult {
  const normalizedInput = normalizeForJudge(input);
  if (
    question.answers.some((answer) => canonicalAnswer(answer) === normalizedInput)
  ) {
    return "correct";
  }
  if (
    question.closeAnswers.some(
      (answer) => canonicalAnswer(answer) === normalizedInput,
    )
  ) {
    return "close";
  }
  return "wrong";
}

export function isSecondClose(closeCount: number): boolean {
  return closeCount + 1 >= CLOSE_LIMIT;
}
