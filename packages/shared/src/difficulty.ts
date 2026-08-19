export const DIFFICULTY_RANKS = [
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S-",
  "S",
  "S+",
  "SS-",
  "SS",
  "SS+",
] as const;

export type DifficultyRank = (typeof DIFFICULTY_RANKS)[number];

export const DIFFICULTY_BANDS = [
  "easy",
  "normal",
  "slightly_hard",
  "hard",
  "extreme",
] as const;

export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

export const DIFFICULTY_BAND_LABEL: Record<DifficultyBand, string> = {
  easy: "簡単",
  normal: "普通",
  slightly_hard: "微難問",
  hard: "難問",
  extreme: "超難問",
};

export function bandOfRank(rank: DifficultyRank): DifficultyBand {
  if (rank.startsWith("C")) {
    return "easy";
  }
  if (rank.startsWith("B")) {
    return "normal";
  }
  if (rank.startsWith("A")) {
    return "slightly_hard";
  }
  if (rank.startsWith("S") && !rank.startsWith("SS")) {
    return "hard";
  }
  return "extreme";
}
