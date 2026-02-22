import { AnalyticsService } from '../../AnalyticsService';
import { PrismaClient, BillStatus } from '@prisma/client';
import { TestHelpers } from '../helpers';

jest.mock('@prisma/client');
jest.mock('date-fns');

const mockPrisma = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const { subDays, format } = require('date-fns');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPrismaInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaInstance = {
      payment: {
        aggregate: jest.fn(),
        findMany: jest.fn()
      },
      bill: {
        count: jest.fn(),
        aggregate: jest.fn()
      },
      user: {
        findMany: jest.fn()
      },
      report: {
        create: jest.fn()
      }
    };
    mockPrisma.mockImplementation(() => mockPrismaInstance);
    analyticsService = new AnalyticsService();
  });

  describe('getBillingStats', () => {
    it('should return billing statistics', async () => {
      const mockRevenueData = { _sum: { amount: 10000.50 } };
      const mockOverdueCount = 25;
      const mockPendingCount = 50;

      mockPrismaInstance.payment.aggregate.mockResolvedValue(mockRevenueData);
      mockPrismaInstance.bill.count
        .mockResolvedValueOnce(mockOverdueCount)
        .mockResolvedValueOnce(mockPendingCount);

      const result = await analyticsService.getBillingStats();

      expect(result).toEqual({
        totalRevenue: 10000.50,
        overdueBills: 25,
        pendingBills: 50
      });

      expect(mockPrismaInstance.payment.aggregate).toHaveBeenCalledWith({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      });

      expect(mockPrismaInstance.bill.count).toHaveBeenCalledWith({
        where: { status: BillStatus.OVERDUE }
      });

      expect(mockPrismaInstance.bill.count).toHaveBeenCalledWith({
        where: { status: BillStatus.PENDING }
      });
    });

    it('should handle zero revenue', async () => {
      const mockRevenueData = { _sum: { amount: null } };
      const mockOverdueCount = 0;
      const mockPendingCount = 0;

      mockPrismaInstance.payment.aggregate.mockResolvedValue(mockRevenueData);
      mockPrismaInstance.bill.count
        .mockResolvedValueOnce(mockOverdueCount)
        .mockResolvedValueOnce(mockPendingCount);

      const result = await analyticsService.getBillingStats();

      expect(result).toEqual({
        totalRevenue: 0,
        overdueBills: 0,
        pendingBills: 0
      });
    });
  });

  describe('getLateFeeRevenue', () => {
    it('should return late fee revenue', async () => {
      const mockLateFeeData = { _sum: { lateFee: 500.75 } };

      mockPrismaInstance.bill.aggregate.mockResolvedValue(mockLateFeeData);

      const result = await analyticsService.getLateFeeRevenue();

      expect(result).toEqual(mockLateFeeData);
      expect(mockPrismaInstance.bill.aggregate).toHaveBeenCalledWith({
        where: { lateFee: { gt: 0 } },
        _sum: { lateFee: true }
      });
    });
  });

  describe('getDailyRevenue', () => {
    const mockStartDate = new Date('2023-01-01');

    beforeEach(() => {
      subDays.mockReturnValue(mockStartDate);
      format.mockImplementation((date: Date) => date.toISOString().split('T')[0]);
    });

    it('should return daily revenue for specified days', async () => {
      const days = 30;
      const mockPayments = [
        { createdAt: new Date('2023-01-15'), amount: 100 },
        { createdAt: new Date('2023-01-15'), amount: 50 },
        { createdAt: new Date('2023-01-16'), amount: 75 }
      ];

      mockPrismaInstance.payment.findMany.mockResolvedValue(mockPayments);

      const result = await analyticsService.getDailyRevenue(days);

      expect(subDays).toHaveBeenCalledWith(expect.any(Date), days);
      expect(mockPrismaInstance.payment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: mockStartDate }
        },
        select: { createdAt: true, amount: true }
      });

      expect(result).toEqual([
        { date: '2023-01-15', value: 150 },
        { date: '2023-01-16', value: 75 }
      ]);
      expect(result).toHaveLength(2);
    });

    it('should use default 30 days when not specified', async () => {
      mockPrismaInstance.payment.findMany.mockResolvedValue([]);

      await analyticsService.getDailyRevenue();

      expect(subDays).toHaveBeenCalledWith(expect.any(Date), 30);
    });

    it('should handle empty payment data', async () => {
      mockPrismaInstance.payment.findMany.mockResolvedValue([]);

      const result = await analyticsService.getDailyRevenue(30);

      expect(result).toEqual([]);
    });

    it('should sort results by date', async () => {
      const mockPayments = [
        { createdAt: new Date('2023-01-20'), amount: 100 },
        { createdAt: new Date('2023-01-10'), amount: 50 },
        { createdAt: new Date('2023-01-15'), amount: 75 }
      ];

      mockPrismaInstance.payment.findMany.mockResolvedValue(mockPayments);

      const result = await analyticsService.getDailyRevenue(30);

      const dates = result.map(r => r.date);
      expect(dates).toEqual(['2023-01-10', '2023-01-15', '2023-01-20']);
    });
  });

  describe('getUserGrowth', () => {
    const mockStartDate = new Date('2023-01-01');

    beforeEach(() => {
      subDays.mockReturnValue(mockStartDate);
      format.mockImplementation((date: Date) => date.toISOString().split('T')[0]);
    });

    it('should return user growth data', async () => {
      const days = 30;
      const mockUsers = [
        { createdAt: new Date('2023-01-15') },
        { createdAt: new Date('2023-01-15') },
        { createdAt: new Date('2023-01-16') },
        { createdAt: new Date('2023-01-17') }
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockUsers);

      const result = await analyticsService.getUserGrowth(days);

      expect(subDays).toHaveBeenCalledWith(expect.any(Date), days);
      expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith({
        where: { createdAt: { gte: mockStartDate } },
        select: { createdAt: true }
      });

      expect(result).toEqual([
        { date: '2023-01-15', count: 2 },
        { date: '2023-01-16', count: 1 },
        { date: '2023-01-17', count: 1 }
      ]);
    });

    it('should use default 30 days when not specified', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);

      await analyticsService.getUserGrowth();

      expect(subDays).toHaveBeenCalledWith(expect.any(Date), 30);
    });

    it('should handle empty user data', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);

      const result = await analyticsService.getUserGrowth(30);

      expect(result).toEqual([]);
    });

    it('should sort results by date', async () => {
      const mockUsers = [
        { createdAt: new Date('2023-01-20') },
        { createdAt: new Date('2023-01-10') },
        { createdAt: new Date('2023-01-15') }
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockUsers);

      const result = await analyticsService.getUserGrowth(30);

      const dates = result.map(r => r.date);
      expect(dates).toEqual(['2023-01-10', '2023-01-15', '2023-01-20']);
    });
  });

  describe('predictRevenue', () => {
    it('should predict revenue based on daily revenue', async () => {
      const mockDailyRevenue = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 150 },
        { date: '2023-01-03', value: 120 }
      ];

      jest.spyOn(analyticsService, 'getDailyRevenue').mockResolvedValue(mockDailyRevenue);

      const result = await analyticsService.predictRevenue();

      expect(analyticsService.getDailyRevenue).toHaveBeenCalledWith(30);
      
      const expectedAverage = (100 + 150 + 120) / 3; // 123.33
      expect(result).toEqual({
        predictedDailyRevenue: expectedAverage,
        predictedMonthlyRevenue: expectedAverage * 30,
        trend: 'DOWN', // Last day (120) is less than average (123.33)
        confidence: 'MEDIUM'
      });
    });

    it('should predict upward trend when last day > average', async () => {
      const mockDailyRevenue = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 100 },
        { date: '2023-01-03', value: 150 }
      ];

      jest.spyOn(analyticsService, 'getDailyRevenue').mockResolvedValue(mockDailyRevenue);

      const result = await analyticsService.predictRevenue();

      expect(result.trend).toBe('UP'); // Last day (150) > average (116.67)
    });

    it('should return low confidence for no data', async () => {
      jest.spyOn(analyticsService, 'getDailyRevenue').mockResolvedValue([]);

      const result = await analyticsService.predictRevenue();

      expect(result).toEqual({ prediction: 0, confidence: 'LOW' });
    });
  });

  describe('saveReport', () => {
    it('should save report successfully', async () => {
      const userId = 'user-123';
      const title = 'Monthly Report';
      const type = 'REVENUE';
      const data = { revenue: 10000 };

      const mockReport = {
        id: 'report-123',
        title,
        type,
        data,
        createdBy: userId,
        createdAt: new Date()
      };

      mockPrismaInstance.report.create.mockResolvedValue(mockReport);

      const result = await analyticsService.saveReport(userId, title, type, data);

      expect(result).toEqual(mockReport);
      expect(mockPrismaInstance.report.create).toHaveBeenCalledWith({
        data: {
          title,
          type,
          data,
          createdBy: userId
        }
      });
    });
  });

  describe('exportRevenueData', () => {
    it('should export revenue data as CSV', async () => {
      const mockRevenueData = [
        { date: '2023-01-01', value: 100.50 },
        { date: '2023-01-02', value: 150.75 }
      ];

      jest.spyOn(analyticsService, 'getDailyRevenue').mockResolvedValue(mockRevenueData);

      const result = await analyticsService.exportRevenueData();

      expect(analyticsService.getDailyRevenue).toHaveBeenCalledWith(90);
      expect(result).toBe(
        'Date,Revenue\n' +
        '2023-01-01,100.50\n' +
        '2023-01-02,150.75'
      );
    });

    it('should handle empty revenue data', async () => {
      jest.spyOn(analyticsService, 'getDailyRevenue').mockResolvedValue([]);

      const result = await analyticsService.exportRevenueData();

      expect(result).toBe('Date,Revenue\n');
    });
  });
});
