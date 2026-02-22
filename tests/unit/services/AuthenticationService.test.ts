import { AuthenticationService, RegisterData, LoginCredentials } from '../../services/AuthenticationService';
import { PrismaClient, UserStatus, UserRole, TwoFactorMethod } from '@prisma/client';
import { TestHelpers } from '../helpers';
import bcrypt from 'bcryptjs';

jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode');

const mockPrisma = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockPrismaInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaInstance = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      userProfile: {
        create: jest.fn()
      },
      userSession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      auditLog: {
        create: jest.fn()
      }
    };
    mockPrisma.mockImplementation(() => mockPrismaInstance);
    authService = new AuthenticationService();
  });

  describe('register', () => {
    const validRegisterData: RegisterData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      name: 'Test User'
    };

    it('should successfully register a new user', async () => {
      // Mock no existing user
      mockPrismaInstance.user.findFirst.mockResolvedValue(null);
      
      // Mock password hashing
      mockBcrypt.hash.mockResolvedValue('hashedPassword');
      
      // Mock user creation
      const mockUser = {
        id: 'user-id',
        email: validRegisterData.email,
        username: validRegisterData.username,
        status: UserStatus.PENDING_VERIFICATION
      };
      mockPrismaInstance.user.create.mockResolvedValue(mockUser);
      mockPrismaInstance.userProfile.create.mockResolvedValue({});
      mockPrismaInstance.auditLog.create.mockResolvedValue({});

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockPrismaInstance.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: validRegisterData.email,
          username: validRegisterData.username,
          passwordHash: 'hashedPassword',
          name: validRegisterData.name,
          status: UserStatus.PENDING_VERIFICATION
        })
      });
    });

    it('should return error if email already exists', async () => {
      const existingUser = { email: validRegisterData.email };
      mockPrismaInstance.user.findFirst.mockResolvedValue(existingUser);

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
      expect(mockPrismaInstance.user.create).not.toHaveBeenCalled();
    });

    it('should return error if username already exists', async () => {
      const existingUser = { username: validRegisterData.username };
      mockPrismaInstance.user.findFirst.mockResolvedValue(existingUser);

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already taken');
      expect(mockPrismaInstance.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaInstance.user.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await authService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });
  });

  describe('login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    const mockUser = {
      id: 'user-id',
      email: validCredentials.email,
      passwordHash: 'hashedPassword',
      status: UserStatus.ACTIVE,
      loginAttempts: 0,
      twoFactorEnabled: false,
      role: UserRole.USER
    };

    beforeEach(() => {
      mockBcrypt.compare.mockResolvedValue(true);
    });

    it('should successfully login with valid credentials', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaInstance.user.update.mockResolvedValue(mockUser);
      
      const mockSessionData = {
        token: 'jwt-token',
        refreshToken: 'refresh-token'
      };
      jest.spyOn(authService as any, 'createSession').mockResolvedValue(mockSessionData);
      jest.spyOn(authService as any, 'logAudit').mockResolvedValue({});
      mockPrismaInstance.auditLog.create.mockResolvedValue({});

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('jwt-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should return error for invalid email', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should return error for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };
      mockPrismaInstance.user.findUnique.mockResolvedValue(lockedUser);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account temporarily locked. Please try again later.');
    });

    it('should return error for inactive account', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION
      };
      mockPrismaInstance.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is not active');
    });

    it('should return error for invalid password', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);
      
      jest.spyOn(authService as any, 'handleFailedLogin').mockResolvedValue({});

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(authService['handleFailedLogin']).toHaveBeenCalledWith(mockUser.id);
    });

    it('should require 2FA when enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorMethod: TwoFactorMethod.AUTHENTICATOR_APP
      };
      mockPrismaInstance.user.findUnique.mockResolvedValue(userWith2FA);

      const result = await authService.login(validCredentials);

      expect(result.success).toBe(false);
      expect(result.requiresTwoFactor).toBe(true);
      expect(result.twoFactorMethods).toEqual([TwoFactorMethod.AUTHENTICATOR_APP]);
    });
  });

  describe('loginWithWallet', () => {
    const walletAddress = 'GDTESTACCOUNT123456789';

    it('should create new user if wallet address not found', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      
      const mockNewUser = {
        id: 'new-user-id',
        email: `${walletAddress}@stellar.wallet`,
        walletAddress,
        status: UserStatus.ACTIVE,
        isEmailVerified: true
      };
      mockPrismaInstance.user.create.mockResolvedValue(mockNewUser);
      mockPrismaInstance.userProfile.create.mockResolvedValue({});
      mockPrismaInstance.user.update.mockResolvedValue(mockNewUser);
      
      const mockSessionData = {
        token: 'jwt-token',
        refreshToken: 'refresh-token'
      };
      jest.spyOn(authService as any, 'createSession').mockResolvedValue(mockSessionData);
      jest.spyOn(authService as any, 'logAudit').mockResolvedValue({});
      mockPrismaInstance.auditLog.create.mockResolvedValue({});

      const result = await authService.loginWithWallet(walletAddress);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockNewUser);
      expect(mockPrismaInstance.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: `${walletAddress}@stellar.wallet`,
          walletAddress,
          status: UserStatus.ACTIVE,
          isEmailVerified: true
        })
      });
    });

    it('should login existing wallet user', async () => {
      const existingWalletUser = {
        id: 'existing-user-id',
        email: `${walletAddress}@stellar.wallet`,
        walletAddress,
        status: UserStatus.ACTIVE
      };
      mockPrismaInstance.user.findUnique.mockResolvedValue(existingWalletUser);
      mockPrismaInstance.user.update.mockResolvedValue(existingWalletUser);
      
      const mockSessionData = {
        token: 'jwt-token',
        refreshToken: 'refresh-token'
      };
      jest.spyOn(authService as any, 'createSession').mockResolvedValue(mockSessionData);
      jest.spyOn(authService as any, 'logAudit').mockResolvedValue({});
      mockPrismaInstance.auditLog.create.mockResolvedValue({});

      const result = await authService.loginWithWallet(walletAddress);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(existingWalletUser);
      expect(mockPrismaInstance.user.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const mockDecoded = { userId: 'user-id' };
    const mockSession = {
      id: 'session-id',
      userId: 'user-id',
      refreshToken,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER
      }
    };

    it('should refresh token with valid refresh token', async () => {
      const { verify } = require('jsonwebtoken');
      verify.mockReturnValue(mockDecoded);
      
      mockPrismaInstance.userSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaInstance.userSession.update.mockResolvedValue({});
      
      const mockNewSessionData = {
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token'
      };
      jest.spyOn(authService as any, 'createSession').mockResolvedValue(mockNewSessionData);

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-jwt-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockPrismaInstance.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { isActive: false }
      });
    });

    it('should return error for invalid refresh token', async () => {
      const { verify } = require('jsonwebtoken');
      verify.mockImplementation(() => { throw new Error('Invalid token'); });

      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });
  });

  describe('verifyToken', () => {
    const validToken = 'valid-jwt-token';
    const mockDecoded = { userId: 'user-id', sessionId: 'session-id' };
    const mockSession = {
      userId: 'user-id',
      sessionId: 'session-id',
      isActive: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER
      }
    };

    it('should verify valid token', async () => {
      const { verify } = require('jsonwebtoken');
      verify.mockReturnValue(mockDecoded);
      
      mockPrismaInstance.userSession.findFirst.mockResolvedValue(mockSession);

      const result = await authService.verifyToken(validToken);

      expect(result.user).toEqual(mockSession.user);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid token', async () => {
      const { verify } = require('jsonwebtoken');
      verify.mockImplementation(() => { throw new Error('Invalid token'); });

      const result = await authService.verifyToken(validToken);

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid token');
    });

    it('should return error for expired session', async () => {
      const { verify } = require('jsonwebtoken');
      verify.mockReturnValue(mockDecoded);
      
      mockPrismaInstance.userSession.findFirst.mockResolvedValue(null);

      const result = await authService.verifyToken(validToken);

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid or expired session');
    });
  });

  describe('hasPermission', () => {
    it('should grant permission for same role', async () => {
      const user = { role: UserRole.USER };
      
      const result = await authService.hasPermission(user, UserRole.USER);
      
      expect(result).toBe(true);
    });

    it('should grant permission for higher role', async () => {
      const admin = { role: UserRole.ADMIN };
      
      const result = await authService.hasPermission(admin, UserRole.USER);
      
      expect(result).toBe(true);
    });

    it('should deny permission for lower role', async () => {
      const user = { role: UserRole.USER };
      
      const result = await authService.hasPermission(user, UserRole.ADMIN);
      
      expect(result).toBe(false);
    });
  });
});
