import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalTeardown() {
  console.log('Tearing down test environment...');
  
  try {
    // Clean up test database
    await prisma.$disconnect();
    console.log('Test database teardown complete');
  } catch (error) {
    console.error('Error during teardown:', error);
    throw error;
  }
}
