import { PrismaClient } from "@/generated/prisma/client";
import { initializeApplication } from "./initialize";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log SQL queries in development
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: any) => {
    logger.debug('SQL Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log SQL errors
(prisma as any).$on('error', (e: any) => {
  logger.error(
    'Database Error',
    new Error(e.message),
    {
      target: e.target,
      timestamp: new Date().toISOString(),
    }
  );
});

// Log SQL warnings
(prisma as any).$on('warn', (e: any) => {
  logger.warn('Database Warning', {
    message: e.message,
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Only initialize at runtime, not during build
// Skip initialization if SKIP_DB_INIT is set (used during Docker build)
if (process.env.SKIP_DB_INIT !== "true") {
  initializeApplication().catch((error) => {
    console.error("[Prisma] Failed to initialize application:", error);
    // Don't exit during build
    if (process.env.NODE_ENV === "production" && !process.env.CI) {
      process.exit(1);
    }
  });
}
