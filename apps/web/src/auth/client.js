// Runtime-only file. Types come from client.d.ts.
// @ts-nocheck
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    inferAdditionalFields({
      user: {
        handle: {
          type: "string",
          required: true,
        },
        role: {
          type: "string",
          required: true,
        },
      },
    }),
  ],
});
