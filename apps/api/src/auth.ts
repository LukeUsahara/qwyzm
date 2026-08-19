import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError } from "better-auth/api";
import type { AppDb } from "@qwyzm/db";
import { accounts, sessions, users, verifications } from "@qwyzm/db";
import { handleSchema } from "@qwyzm/validation";

const DEV_SECRET = "dev-only-qwyzm-auth-secret-change-me";

export function authOrigins(): string[] {
  const raw = process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
  const extra = process.env.AUTH_ORIGINS?.split(",").map((item) => item.trim()) ?? [];
  return [...new Set([raw, "http://127.0.0.1:5173", ...extra])];
}

export function createAuth(db: AppDb) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    secret: process.env.BETTER_AUTH_SECRET ?? DEV_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    basePath: "/api/auth",
    trustedOrigins: authOrigins(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        handle: {
          type: "string",
          required: true,
          input: true,
        },
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const parsed = handleSchema.safeParse(
              typeof user.handle === "string" ? user.handle : "",
            );
            if (!parsed.success) {
              throw new APIError("BAD_REQUEST", {
                message: "handle は3〜16文字の英数字と _ です",
              });
            }
            return { data: { ...user, handle: parsed.data, role: "user" } };
          },
        },
        update: {
          before: async (user) => {
            const next = { ...user };
            delete next.handle;
            delete next.email;
            delete next.role;
            return { data: next };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
