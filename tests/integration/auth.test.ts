import request from 'supertest';
import app from '../../app';
import { TestHelpers } from '../helpers';
import { prisma } from '../setup';

describe('Authentication API Integration Tests', () => {
  let testUser: any;
  let authToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    await TestHelpers.cleanupTestData();
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestData();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Registration successful. Please verify your email.',
        user: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          status: 'PENDING_VERIFICATION'
        }
      });
      expect(response.body.user.id).toBeDefined();
    });

    it('should return error for duplicate email', async () => {
      testUser = await TestHelpers.createTestUser({
        email: 'existing@example.com'
      });

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'newuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
    });

    it('should return error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should return error for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser({
        status: 'ACTIVE'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          id: testUser.id,
          email: testUser.email,
          username: testUser.username,
          name: testUser.name,
          role: testUser.role
        }
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      authToken = response.body.token;
      refreshToken = response.body.refreshToken;
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/wallet', () => {
    const walletAddress = 'GDTESTACCOUNT123456789';

    it('should login with wallet successfully', async () => {
      const walletData = {
        walletAddress
      };

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(walletData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Wallet login successful',
        user: {
          email: `${walletAddress}@stellar.wallet`,
          walletAddress
        }
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should create new user for first-time wallet login', async () => {
      const newWalletAddress = 'GDNEWUSER123456789';
      const walletData = {
        walletAddress: newWalletAddress
      };

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(walletData)
        .expect(200);

      expect(response.body.user.walletAddress).toBe(newWalletAddress);
      expect(response.body.user.email).toBe(`${newWalletAddress}@stellar.wallet`);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
      
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should return error for invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
      
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(400);

      expect(response.body.error).toBe('Token required');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(400);

      expect(response.body.error).toBe('Logout failed');
    });
  });

  describe('GET /api/user/profile', () => {
    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
      
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      authToken = loginResponse.body.token;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role,
        status: testUser.status
      });
    });

    it('should return error for missing authorization', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
