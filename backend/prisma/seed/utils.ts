import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

let cachedHash: string | null = null;

/**
 * Gets a cached bcrypt hash for "Password@123" to make seeding extremely fast.
 */
export async function getSharedPasswordHash(): Promise<string> {
  if (cachedHash) {
    return cachedHash;
  }
  cachedHash = await bcrypt.hash('Password@123', 10);
  return cachedHash;
}

/**
 * Generates a random date between two dates.
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generates a random date in the last N months.
 */
export function dateInLastMonths(months: number): Date {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return randomDate(start, end);
}

/**
 * Clears all tables in the database in the correct order using raw SQL CASCADE truncation.
 */
export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  console.log('Clearing database tables...');
  
  const tables = [
    'ocr_results',
    'document_analyses',
    'documents',
    'notifications',
    'readiness_assessments',
    'ai_messages',
    'ai_conversations',
    'refresh_tokens',
    'family_members',
    'families',
    'users',
    'life_events',
    'document_categories',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.warn(`Could not truncate table "${table}" (it might not exist yet):`, error.message);
    }
  }
  
  console.log('Database cleared.');
}
