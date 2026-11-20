import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL Database connection established successfully via Prisma ORM.');
    return true;
  } catch (error) {
    console.error('⚠️ PostgreSQL connection failed:', error instanceof Error ? error.message : error);
    console.warn('⚠️ Please ensure PostgreSQL is running (e.g. docker compose up -d) or check DATABASE_URL.');
    return false;
  }
}
