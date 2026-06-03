import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads env files. We keep env vars in .env.local
// (the Vercel convention), so load that (falling back to .env) before
// defineConfig reads DIRECT_URL below.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 removed directUrl — the CLI uses this url for migrations and
    // db push. Point it at Neon's direct (unpooled) connection (host without
    // "-pooler") so schema operations work. The PrismaClient at runtime uses
    // DATABASE_URL (the pooled connection) instead.
    url: process.env["DIRECT_URL"],
  },
});
