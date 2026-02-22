import request from 'supertest';
import app from '../../app';
import { TestHelpers } from '../helpers';
import { prisma } from '../setup';

describe('Payment API Integration Tests', () => {
  let testUser: any;
  let testBill: any;
  let authToken: string;

  beforeEach(async () => {
    await TestHelpers.cleanupTestData();
    
    testUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
    
    const loginData = {
      email: testUser.email,
      password: 'password123'
    };

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    authToken = loginResponse.body.token;
    
    testBill = await TestHelpers.createTestBill({
      userId: testUser.id,
      amount: 100.50,
      status: 'PENDING'
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestData();
  });

  describe('POST /api/payment/process', () => {
    it('should process payment successfully', async () => {
      const paymentData = {
        billId: testBill.id,
        amount: 100.50,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 200,
        message: 'Payment processed successfully'
      });
      expect(response.body.data).toBeDefined();
    });

    it('should return error for unauthenticated user', async () => {
      const paymentData = {
        billId: testBill.id,
        amount: 100.50,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .expect(401);

      expect(response.body.error).toBe('User authentication required');
    });

    it('should return error for missing billId', async () => {
      const paymentData = {
        amount: 100.50,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Missing required payment fields');
    });

    it('should return error for missing amount', async () => {
      const paymentData = {
        billId: testBill.id,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Missing required payment fields');
    });

    it('should return error for missing payment method', async () => {
      const paymentData = {
        billId: testBill.id,
        amount: 100.50
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Missing required payment fields');
    });

    it('should return error for zero amount', async () => {
      const paymentData = {
        billId: testBill.id,
        amount: 0,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Payment amount must be greater than 0');
    });

    it('should return error for negative amount', async () => {
      const paymentData = {
        billId: testBill.id,
        amount: -50,
        paymentMethod: 'CREDIT_CARD'
      };

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Payment amount must be greater than 0');
    });
  });

  describe('GET /api/payment/history', () => {
    beforeEach(async () => {
      // Create some test payments
      await TestHelpers.createTestPayment({
        userId: testUser.id,
        amount: 50,
        status: 'SUCCESS'
      });
      
      await TestHelpers.createTestPayment({
        userId: testUser.id,
        amount: 75,
        status: 'PENDING'
      });
    });

    it('should get payment history successfully', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 200,
        data: expect.any(Array)
      });
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return error for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/payment/history')
        .expect(401);

      expect(response.body.error).toBe('User authentication required');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/payment/history?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset parameter', async () => {
      const response1 = await request(app)
        .get('/api/payment/history?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/payment/history?limit=5&offset=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Offset should skip the first result
      expect(response2.body.data.length).toBeLessThanOrEqual(response1.body.data.length);
    });
  });

  describe('POST /api/payment/validate', () => {
    it('should validate payment data successfully', async () => {
      const validationData = {
        billId: testBill.id,
        amount: 100.50
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 200,
        message: 'Payment data is valid',
        data: {
          billAmount: testBill.amount,
          totalDue: expect.any(Number)
        }
      });
    });

    it('should return error for unauthenticated user', async () => {
      const validationData = {
        billId: testBill.id,
        amount: 100.50
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .send(validationData)
        .expect(401);

      expect(response.body.error).toBe('User authentication required');
    });

    it('should return error for non-existent bill', async () => {
      const validationData = {
        billId: 'non-existent-bill-id',
        amount: 100.50
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(404);

      expect(response.body.error).toBe('Bill not found or access denied');
    });

    it('should return error for bill belonging to different user', async () => {
      const otherUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
      const otherUserBill = await TestHelpers.createTestBill({
        userId: otherUser.id,
        amount: 50
      });

      const validationData = {
        billId: otherUserBill.id,
        amount: 50
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(404);

      expect(response.body.error).toBe('Bill not found or access denied');
    });

    it('should return error for zero amount', async () => {
      const validationData = {
        billId: testBill.id,
        amount: 0
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(400);

      expect(response.body.error).toBe('Invalid payment amount');
    });

    it('should return error for negative amount', async () => {
      const validationData = {
        billId: testBill.id,
        amount: -50
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(400);

      expect(response.body.error).toBe('Invalid payment amount');
    });

    it('should return error for amount exceeding total due', async () => {
      const validationData = {
        billId: testBill.id,
        amount: 200 // More than bill amount
      };

      const response = await request(app)
        .post('/api/payment/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(400);

      expect(response.body.error).toBe('Invalid payment amount');
    });
  });
});
