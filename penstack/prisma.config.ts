import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 removed directUrl — the CLI uses this url for migrations and db push.
    // Point it at the session-mode pooler (port 5432) so schema operations work.
    // The PrismaClient at runtime uses DATABASE_URL (transaction-mode, port 6543) instead.
    url: process.env["DIRECT_URL"],
  },
});
