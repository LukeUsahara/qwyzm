import { timingSafeEqual } from "node:crypto";

export const DEV_INTERNAL_TOKEN = "qwyzm-dev-internal";

export function expectedInternalToken(): string {
  return process.env.INTERNAL_TOKEN ?? DEV_INTERNAL_TOKEN;
}

export function internalTokenMatches(header: string | undefined, expected: string): boolean {
  const got = Buffer.from(header ?? "", "utf8");
  const want = Buffer.from(expected, "utf8");
  if (got.length !== want.length) {
    return false;
  }
  return timingSafeEqual(got, want);
}
