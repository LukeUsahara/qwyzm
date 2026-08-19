import { serve } from "@hono/node-server";
import {
  createDrizzlePlayRepository,
  createDrizzleQuestionRepository,
  openCatalogDatabase,
} from "@qwyzm/db";
import { createApp, accountRoleOf, type AuthGateway, type AuthUser } from "./app.ts";
import { createAuth } from "./auth.ts";

const port = Number(process.env.API_PORT ?? 8787);
const catalog = await openCatalogDatabase();
const auth = createAuth(catalog.db);

const gateway: AuthGateway = {
  handler: (request) => auth.handler(request),
  async getSession(headers) {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return null;
    }
    const user = session.user as typeof session.user & { handle?: string; role?: string };
    const mapped: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      handle: user.handle ?? "",
      role: accountRoleOf(user.role),
    };
    return { user: mapped };
  },
};

const questions = createDrizzleQuestionRepository(catalog.db);
const app = createApp(questions, {
  auth: gateway,
  plays: (userId) => createDrizzlePlayRepository(catalog.db, userId),
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`qwyzm-api http://localhost:${info.port} (${catalog.kind})`);
});

const listed = await questions.listQuestions();
console.log(`catalog ${listed.length} official questions`);
