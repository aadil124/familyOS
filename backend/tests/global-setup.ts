import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async () => {
  console.log('\nRunning global setup for E2E tests...');
  // Load test environment variables
  const envPath = path.resolve(__dirname, '../.env.test');
  dotenv.config({ path: envPath, override: true });

  console.log('Applying Prisma migrations to the test database...');
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    console.log('Migrations applied successfully to test database.');
  } catch (error) {
    console.error('Error applying migrations to test database:', error);
    throw error;
  }
};
