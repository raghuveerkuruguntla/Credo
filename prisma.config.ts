import "dotenv/config";
import { defineConfig } from "prisma/config";

// Loads DATABASE_URL from .env / .env.local for the Prisma CLI (migrate, db push).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
