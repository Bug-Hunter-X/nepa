import { BillingService } from '../../BillingService';
import { PrismaClient, BillStatus } from '@prisma/client';
import { TestHelpers } from '../helpers';

jest.mock('@prisma/client');
jest.mock('date-fns');
jest.mock('./NotificationService');

const mockPrisma = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const { differenceInDays, addDays } = require('date-fns');

describe('BillingService', () => {
  let billingService: BillingService;
  let mockPrismaInstance: any;
  let mockNotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaInstance = {
      bill: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      coupon: {
        findUnique: jest.fn()
      }
    };
    mockPrisma.mockImplementation(() => mockPrismaInstance);
    
    mockNotificationService = {
      sendBillCreated: jest.fn(),
      sendBillOverdue: jest.fn()
    };
    
    billingService = new BillingService();
    (billingService as any).notificationService = mockNotificationService;
  });

  describe('generateBill', () => {
    it('should generate a bill successfully', async () => {
      const userId = 'user-id';
      const utilityId = 'utility-id';
      const amount = 100.50;
      const dueDateDays = 30;
      
      const expectedDueDate = new Date();
      addDays.mockReturnValue(expectedDueDate);
      
      const mockBill = {
        id: 'bill-id',
        userId,
        utilityId,
        amount,
        dueDate: expectedDueDate,
        status: BillStatus.PENDING,
        user: { id: userId, email: 'test@example.com' }
      };
      
      mockPrismaInstance.bill.create.mockResolvedValue(mockBill);
      mockNotificationService.sendBillCreated.mockResolvedValue({});

      const result = await billingService.generateBill(userId, utilityId, amount, dueDateDays);

      expect(result).toEqual(mockBill);
      expect(mockPrismaInstance.bill.create).toHaveBeenCalledWith({
        data: {
          userId,
          utilityId,
          amount,
          dueDate: expectedDueDate,
          status: BillStatus.PENDING
        },
        include: { user: true }
      });
      expect(addDays).toHaveBeenCalledWith(expect.any(Date), dueDateDays);
      expect(mockNotificationService.sendBillCreated).toHaveBeenCalledWith(userId, mockBill);
    });

    it('should use default due date of 30 days', async () => {
      const userId = 'user-id';
      const utilityId = 'utility-id';
      const amount = 100.50;
      
      const expectedDueDate = new Date();
      addDays.mockReturnValue(expectedDueDate);
      
      const mockBill = {
        id: 'bill-id',
        userId,
        utilityId,
        amount,
        dueDate: expectedDueDate,
        status: BillStatus.PENDING,
        user: { id: userId, email: 'test@example.com' }
      };
      
      mockPrismaInstance.bill.create.mockResolvedValue(mockBill);
      mockNotificationService.sendBillCreated.mockResolvedValue({});

      await billingService.generateBill(userId, utilityId, amount);

      expect(addDays).toHaveBeenCalledWith(expect.any(Date), 30);
    });
  });

  describe('processOverdueBills', () => {
    it('should process overdue bills and apply late fees', async () => {
      const currentDate = new Date();
      const overdueDate = new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      
      const mockOverdueBills = [
        {
          id: 'bill-1',
          userId: 'user-1',
          amount: 100,
          dueDate: overdueDate,
          status: BillStatus.PENDING,
          user: { id: 'user-1', email: 'user1@example.com' }
        },
        {
          id: 'bill-2',
          userId: 'user-2',
          amount: 200,
          dueDate: overdueDate,
          status: BillStatus.PENDING,
          user: { id: 'user-2', email: 'user2@example.com' }
        }
      ];
      
      mockPrismaInstance.bill.findMany.mockResolvedValue(mockOverdueBills);
      mockPrismaInstance.bill.update.mockResolvedValue({});
      mockNotificationService.sendBillOverdue.mockResolvedValue({});
      differenceInDays.mockReturnValue(5);

      await billingService.processOverdueBills();

      expect(mockPrismaInstance.bill.findMany).toHaveBeenCalledWith({
        where: {
          status: BillStatus.PENDING,
          dueDate: { lt: expect.any(Date) }
        },
        include: { user: true }
      });

      expect(mockPrismaInstance.bill.update).toHaveBeenCalledTimes(2);
      
      // Check first bill update
      expect(mockPrismaInstance.bill.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'bill-1' },
        data: {
          status: BillStatus.OVERDUE,
          lateFee: 5 // 100 * 0.01 * 5
        }
      });

      // Check second bill update
      expect(mockPrismaInstance.bill.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'bill-2' },
        data: {
          status: BillStatus.OVERDUE,
          lateFee: 10 // 200 * 0.01 * 5
        }
      });

      expect(mockNotificationService.sendBillOverdue).toHaveBeenCalledTimes(2);
    });

    it('should handle no overdue bills', async () => {
      mockPrismaInstance.bill.findMany.mockResolvedValue([]);

      await billingService.processOverdueBills();

      expect(mockPrismaInstance.bill.update).not.toHaveBeenCalled();
      expect(mockNotificationService.sendBillOverdue).not.toHaveBeenCalled();
    });
  });

  describe('applyCoupon', () => {
    const billId = 'bill-id';
    const couponCode = 'SAVE10';

    it('should apply percentage coupon successfully', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'PERCENTAGE',
        amount: 10, // 10%
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
      
      const mockBill = {
        id: billId,
        amount: 100,
        discount: 0
      };
      
      const updatedBill = {
        ...mockBill,
        discount: 10 // 10% of 100
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaInstance.bill.findUnique.mockResolvedValue(mockBill);
      mockPrismaInstance.bill.update.mockResolvedValue(updatedBill);

      const result = await billingService.applyCoupon(billId, couponCode);

      expect(result).toEqual(updatedBill);
      expect(mockPrismaInstance.bill.update).toHaveBeenCalledWith({
        where: { id: billId },
        data: { discount: 10 }
      });
    });

    it('should apply fixed amount coupon successfully', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'FIXED',
        amount: 25, // $25 fixed
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      const mockBill = {
        id: billId,
        amount: 100,
        discount: 0
      };
      
      const updatedBill = {
        ...mockBill,
        discount: 25
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaInstance.bill.findUnique.mockResolvedValue(mockBill);
      mockPrismaInstance.bill.update.mockResolvedValue(updatedBill);

      const result = await billingService.applyCoupon(billId, couponCode);

      expect(result).toEqual(updatedBill);
      expect(mockPrismaInstance.bill.update).toHaveBeenCalledWith({
        where: { id: billId },
        data: { discount: 25 }
      });
    });

    it('should cap discount to bill amount', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'FIXED',
        amount: 150, // More than bill amount
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      const mockBill = {
        id: billId,
        amount: 100,
        discount: 0
      };
      
      const updatedBill = {
        ...mockBill,
        discount: 100 // Capped at bill amount
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaInstance.bill.findUnique.mockResolvedValue(mockBill);
      mockPrismaInstance.bill.update.mockResolvedValue(updatedBill);

      const result = await billingService.applyCoupon(billId, couponCode);

      expect(result).toEqual(updatedBill);
      expect(mockPrismaInstance.bill.update).toHaveBeenCalledWith({
        where: { id: billId },
        data: { discount: 100 }
      });
    });

    it('should throw error for invalid coupon', async () => {
      mockPrismaInstance.coupon.findUnique.mockResolvedValue(null);

      await expect(billingService.applyCoupon(billId, couponCode))
        .rejects.toThrow('Invalid or expired coupon');
    });

    it('should throw error for inactive coupon', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'FIXED',
        amount: 25,
        isActive: false, // Inactive
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(billingService.applyCoupon(billId, couponCode))
        .rejects.toThrow('Invalid or expired coupon');
    });

    it('should throw error for expired coupon', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'FIXED',
        amount: 25,
        isActive: true,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(billingService.applyCoupon(billId, couponCode))
        .rejects.toThrow('Invalid or expired coupon');
    });

    it('should throw error for non-existent bill', async () => {
      const mockCoupon = {
        id: 'coupon-id',
        code: couponCode,
        type: 'FIXED',
        amount: 25,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockPrismaInstance.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaInstance.bill.findUnique.mockResolvedValue(null);

      await expect(billingService.applyCoupon(billId, couponCode))
        .rejects.toThrow('Bill not found');
    });
  });
});
