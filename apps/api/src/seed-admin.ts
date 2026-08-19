import { hashPassword } from "better-auth/crypto";
import { ADMIN_SEED, seedAdminUser } from "@qwyzm/db";

export const ADMIN_PASSWORD = "jwnj350-0";

export async function hashAndSeedAdmin(
  db: Parameters<typeof seedAdminUser>[0],
): Promise<void> {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await seedAdminUser(db, passwordHash);
}

export { ADMIN_SEED };
