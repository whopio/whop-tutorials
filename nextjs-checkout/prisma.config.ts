import { config } from "dotenv";
import type { PrismaConfig } from "prisma";

config({ path: ".env.local" });
config();

export default {
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
} satisfies PrismaConfig;
