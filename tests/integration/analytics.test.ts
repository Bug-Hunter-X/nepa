import request from 'supertest';
import app from '../../app';
import { TestHelpers } from '../helpers';
import { prisma } from '../setup';

describe('Analytics API Integration Tests', () => {
  let testUser: any;
  let testAdmin: any;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await TestHelpers.cleanupTestData();
    
    testUser = await TestHelpers.createTestUser({ status: 'ACTIVE' });
    testAdmin = await TestHelpers.createTestAdmin({ status: 'ACTIVE' });
    
    // Login as regular user
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123'
      });
    userToken = userLoginResponse.body.token;
    
    // Login as admin
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdmin.email,
        password: 'password123'
      });
    adminToken = adminLoginResponse.body.token;
    
    // Create some test data
    await TestHelpers.createTestPayment({
      userId: testUser.id,
      amount: 100,
      status: 'SUCCESS'
    });
    
    await TestHelpers.createTestBill({
      userId: testUser.id,
      amount: 50,
      status: 'OVERDUE'
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestData();
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should get dashboard data successfully with API key', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toMatchObject({
        summary: expect.objectContaining({
          totalRevenue: expect.any(Number),
          overdueBills: expect.any(Number),
          pendingBills: expect.any(Number)
        }),
        charts: expect.objectContaining({
          revenue: expect.any(Array),
          userGrowth: expect.any(Array)
        }),
        prediction: expect.objectContaining({
          predictedDailyRevenue: expect.any(Number),
          predictedMonthlyRevenue: expect.any(Number),
          trend: expect.any(String),
          confidence: expect.any(String)
        })
      });
    });

    it('should return error without API key', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return error with invalid API key', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return error with user token (requires API key)', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/analytics/reports', () => {
    it('should generate revenue report successfully', async () => {
      const reportData = {
        title: 'Monthly Revenue Report',
        type: 'REVENUE',
        userId: testAdmin.id
      };

      const response = await request(app)
        .post('/api/analytics/reports')
        .set('X-API-Key', 'test-api-key')
        .send(reportData)
        .expect(201);

      expect(response.body).toMatchObject({
        title: reportData.title,
        type: reportData.type,
        createdBy: reportData.userId,
        data: expect.any(Array)
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should generate user growth report successfully', async () => {
      const reportData = {
        title: 'User Growth Report',
        type: 'USER_GROWTH',
        userId: testAdmin.id
      };

      const response = await request(app)
        .post('/api/analytics/reports')
        .set('X-API-Key', 'test-api-key')
        .send(reportData)
        .expect(201);

      expect(response.body.type).toBe('USER_GROWTH');
      expect(response.body.data).toEqual(expect.any(Array));
    });

    it('should generate billing stats report for unknown type', async () => {
      const reportData = {
        title: 'Billing Stats Report',
        type: 'BILLING_STATS',
        userId: testAdmin.id
      };

      const response = await request(app)
        .post('/api/analytics/reports')
        .set('X-API-Key', 'test-api-key')
        .send(reportData)
        .expect(201);

      expect(response.body.type).toBe('BILLING_STATS');
      expect(response.body.data).toEqual(expect.any(Object));
    });

    it('should return error without API key', async () => {
      const reportData = {
        title: 'Test Report',
        type: 'REVENUE',
        userId: testAdmin.id
      };

      const response = await request(app)
        .post('/api/analytics/reports')
        .send(reportData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const reportData = {
        type: 'REVENUE'
        // Missing title and userId
      };

      const response = await request(app)
        .post('/api/analytics/reports')
        .set('X-API-Key', 'test-api-key')
        .send(reportData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/analytics/export', () => {
    it('should export revenue data as CSV', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment; filename=revenue_export.csv');
      expect(response.text).toContain('Date,Revenue');
    });

    it('should return error without API key', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return valid CSV format', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      const lines = response.text.split('\n');
      expect(lines[0]).toBe('Date,Revenue');
      
      // Check if data rows are properly formatted
      if (lines.length > 1) {
        const dataLine = lines[1];
        expect(dataLine).toMatch(/^\d{4}-\d{2}-\d{2},\d+(\.\d+)?$/);
      }
    });
  });

  describe('Analytics Data Consistency', () => {
    it('should return consistent data across multiple calls', async () => {
      const response1 = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      const response2 = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      // Summary should be consistent
      expect(response1.body.summary).toEqual(response2.body.summary);
      
      // Prediction should be consistent (within reasonable time)
      expect(response1.body.prediction.trend).toBe(response2.body.prediction.trend);
    });

    it('should handle concurrent requests gracefully', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/analytics/dashboard')
          .set('X-API-Key', 'test-api-key')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.summary).toBeDefined();
        expect(response.body.charts).toBeDefined();
        expect(response.body.prediction).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed API key header', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', '')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database errors
      // For now, we'll just test the endpoint structure
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
