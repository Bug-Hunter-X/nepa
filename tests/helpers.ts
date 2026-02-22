import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

const prisma = new PrismaClient();

export class TestHelpers {
  static async createTestUser(overrides: Partial<any> = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER'
    };

    const userData = { ...defaultUser, ...overrides };
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        emailVerified: true
      }
    });

    return user;
  }

  static async createTestAdmin(overrides: Partial<any> = {}) {
    return this.createTestUser({
      email: 'admin@test.com',
      role: 'ADMIN',
      ...overrides
    });
  }

  static generateAuthToken(userId: string, role: string = 'USER') {
    return jwt.sign(
      { userId, role, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only',
      { expiresIn: '1h' }
    );
  }

  static generateRefreshToken(userId: string) {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_for_testing_only',
      { expiresIn: '7d' }
    );
  }

  static generate2FASecret(userEmail: string) {
    return speakeasy.generateSecret({
      name: `NEPA (${userEmail})`,
      issuer: 'NEPA',
      length: 32
    });
  }

  static verify2FAToken(token: string, secret: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
  }

  static async createTestPayment(overrides: Partial<any> = {}) {
    const defaultPayment = {
      amount: 100.50,
      currency: 'USD',
      type: 'ELECTRICITY',
      status: 'PENDING',
      stellarTransactionId: null
    };

    return await prisma.payment.create({
      data: { ...defaultPayment, ...overrides }
    });
  }

  static async createTestBill(overrides: Partial<any> = {}) {
    const defaultBill = {
      amount: 150.75,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      type: 'ELECTRICITY',
      status: 'PENDING'
    };

    return await prisma.bill.create({
      data: { ...defaultBill, ...overrides }
    });
  }

  static async cleanupTestData() {
    // Clean up in order to respect foreign key constraints
    await prisma.payment.deleteMany({});
    await prisma.bill.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  }

  static mockStellarResponse(transactionId: string = 'test-tx-id') {
    return {
      id: transactionId,
      hash: transactionId,
      ledger: 12345,
      created_at: new Date().toISOString(),
      source_account: 'GDTESTACCOUNT123456789',
      fee_paid: '100',
      operation_count: 1,
      envelope_xdr: 'mock-xdr',
      result_xdr: 'mock-result-xdr',
      result_meta_xdr: 'mock-meta-xdr'
    };
  }

  static mockFreighterResponse() {
    return {
      publicKey: 'GDTESTACCOUNT123456789',
      isConnected: true,
      network: 'TESTNET'
    };
  }
}
