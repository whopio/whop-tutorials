import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

// DATABASE_URL_UNPOOLED is Sensitive in Vercel and not pulled to .env.local;
// fall back to a placeholder so `prisma generate` still works locally.
// Operations that touch the database (db push, migrate) run on Vercel with
// the real value injected at build time.
const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
