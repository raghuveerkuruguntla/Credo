import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma singleton with the Neon serverless driver — works locally and on
// serverless hosts (Vercel) without exhausting database connections.
// Lazily initialized so the app builds and runs without DATABASE_URL
// (the store falls back to file storage in that case).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
