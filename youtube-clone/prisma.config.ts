import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env; load Next's .env.local for CLI commands
// (migrate, db push). At runtime the app reads process.env directly.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may be absent (e.g. CI) — env then comes from the environment.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // CLI (migrate/db push) uses the DIRECT (unpooled) connection — pooled
    // PgBouncer can't run migrations. Runtime uses the pooled DATABASE_URL via
    // the pg adapter (lib/prisma.ts).
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
