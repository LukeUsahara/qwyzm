import { LONG_VOWEL } from "@qwyzm/shared";

const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const COMBINING_DAKUTEN = 0x3099;
const COMBINING_HANDAKUTEN = 0x309a;
const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const LONG_VOWEL_CODE = LONG_VOWEL.codePointAt(0) ?? 0x30fc;

export function isAllowedInputChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) {
    return false;
  }
  if (code >= HIRAGANA_START && code <= HIRAGANA_END) {
    return true;
  }
  if (code === COMBINING_DAKUTEN || code === COMBINING_HANDAKUTEN) {
    return true;
  }
  if (code === LONG_VOWEL_CODE) {
    return true;
  }
  if (code >= 0x61 && code <= 0x7a) {
    return true;
  }
  if (code >= 0x30 && code <= 0x39) {
    return true;
  }
  return false;
}

export function isAllowedInput(raw: string): boolean {
  const normalized = raw.normalize("NFKC").toLowerCase();
  return Array.from(normalized).every(isAllowedInputChar);
}

export function filterAllowedInput(raw: string): string {
  const normalized = raw.normalize("NFKC").toLowerCase();
  return Array.from(normalized).filter(isAllowedInputChar).join("");
}

export function katakanaToHiragana(input: string): string {
  return Array.from(input)
    .map((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) {
        return char;
      }
      if (code >= KATAKANA_START && code <= KATAKANA_END) {
        return String.fromCodePoint(code - 0x60);
      }
      return char;
    })
    .join("");
}

/** Normalize a stored or displayed answer for comparison with player input. */
export function normalizeForJudge(raw: string): string {
  const nfkc = raw.normalize("NFKC").toLowerCase();
  const noSpace = nfkc.replace(/\s+/g, "");
  return katakanaToHiragana(noSpace);
}
