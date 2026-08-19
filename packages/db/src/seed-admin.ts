import { eq } from "drizzle-orm";
import { accounts, users } from "./schema.ts";
import type { AppDb } from "./client.ts";

export const ADMIN_SEED = {
  id: "c0a80300-0000-4000-8000-00000000ad01",
  name: "Administer",
  handle: "admin",
  email: "admin@qwyzm.com",
} as const;

export async function seedAdminUser(db: AppDb, passwordHash: string): Promise<void> {
  const [byEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_SEED.email));
  const [byHandle] = await db
    .select()
    .from(users)
    .where(eq(users.handle, ADMIN_SEED.handle));

  const existing = byEmail ?? byHandle;
  const userId = existing?.id ?? ADMIN_SEED.id;

  if (existing === undefined) {
    await db.insert(users).values({
      id: userId,
      name: ADMIN_SEED.name,
      handle: ADMIN_SEED.handle,
      email: ADMIN_SEED.email,
      emailVerified: true,
      role: "admin",
    });
  } else {
    await db
      .update(users)
      .set({
        name: ADMIN_SEED.name,
        handle: ADMIN_SEED.handle,
        email: ADMIN_SEED.email,
        emailVerified: true,
        role: "admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
  if (account === undefined) {
    await db.insert(accounts).values({
      userId,
      accountId: userId,
      providerId: "credential",
      issuer: "local:credential",
      password: passwordHash,
    });
    return;
  }
  await db
    .update(accounts)
    .set({
      password: passwordHash,
      providerId: "credential",
      issuer: "local:credential",
      accountId: userId,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, account.id));
}
