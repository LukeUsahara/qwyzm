import type {
  GrowthComparison,
  MetricComparison,
  QuestionBuzzComparison,
} from "./stats.ts";

export const NO_COMPARISON_MESSAGE = "まだ比較できるだけのデータがありません";
export const NO_QUESTION_BUZZ_AVERAGE_MESSAGE =
  "この問題の平均データはまだありません";

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPercent(ratio: number): string {
  return `${formatNumber(ratio * 100)}%`;
}

export function describeQuestionBuzz(comparison: QuestionBuzzComparison): string {
  if (comparison.previousAverage === null || comparison.delta === null) {
    return NO_QUESTION_BUZZ_AVERAGE_MESSAGE;
  }
  const amount = formatNumber(Math.abs(comparison.delta));
  if (comparison.delta > 0) {
    return `平均より${amount}文字早く押せました`;
  }
  if (comparison.delta < 0) {
    return `平均より${amount}文字遅く押しました`;
  }
  return "平均と同じ押下位置です";
}

export function describeAccuracyGrowth(metric: MetricComparison | null): string {
  if (metric === null) {
    return NO_COMPARISON_MESSAGE;
  }
  const amount = formatPercent(Math.abs(metric.delta));
  if (metric.delta > 0) {
    return `正解率は過去平均より${amount}上がっています`;
  }
  if (metric.delta < 0) {
    return `正解率は過去平均より${amount}下がっています`;
  }
  return "正解率は過去平均と同じです";
}

export function describeAnswerTimeGrowth(metric: MetricComparison | null): string {
  if (metric === null) {
    return NO_COMPARISON_MESSAGE;
  }
  const amount = formatNumber(Math.abs(metric.delta));
  if (metric.delta > 0) {
    return `回答時間は過去平均より${amount}ms 速くなっています`;
  }
  if (metric.delta < 0) {
    return `回答時間は過去平均より${amount}ms 遅くなっています`;
  }
  return "回答時間は過去平均と同じです";
}

export function describeGrowth(growth: GrowthComparison): {
  accuracy: string;
  answerSubmitMs: string;
} {
  return {
    accuracy: describeAccuracyGrowth(growth.accuracy),
    answerSubmitMs: describeAnswerTimeGrowth(growth.answerSubmitMs),
  };
}
