import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalSetup() {
  console.log('Setting up test environment...');
  
  try {
    // Reset database
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/nepa_test'
      }
    });
    
    // Run migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/nepa_test'
      }
    });
    
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
