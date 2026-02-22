import { Request, Response } from 'express';
import { AuthenticationService, LoginCredentials, RegisterData } from '../services/AuthenticationService';
import { TwoFactorMethod } from '@prisma/client';
import Joi from 'joi';

const authService = new AuthenticationService();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  name: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorCode: Joi.string().optional()
});

const walletLoginSchema = Joi.object({
  walletAddress: Joi.string().required()
});

const enable2FASchema = Joi.object({
  method: Joi.string().valid(...Object.values(TwoFactorMethod)).required()
});

const verify2FASchema = Joi.object({
  code: Joi.string().required()
});

export class AuthenticationController {
  async register(req: Request, res: Response) {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const result = await authService.register(value as RegisterData);
      
      if (result.success) {
        res.status(201).json({
          message: 'Registration successful. Please verify your email.',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            username: result.user!.username,
            name: result.user!.name,
            status: result.user!.status
          }
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Register controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.login(value as LoginCredentials, userAgent, ipAddress);
      
      if (result.success) {
        res.json({
          message: 'Login successful',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            username: result.user!.username,
            name: result.user!.name,
            role: result.user!.role,
            walletAddress: result.user!.walletAddress
          },
          token: result.token,
          refreshToken: result.refreshToken
        });
      } else if (result.requiresTwoFactor) {
        res.status(200).json({
          requiresTwoFactor: true,
          twoFactorMethods: result.twoFactorMethods,
          error: result.error
        });
      } else {
        res.status(401).json({ error: result.error });
      }
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async loginWithWallet(req: Request, res: Response) {
    try {
      const { error, value } = walletLoginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.loginWithWallet(value.walletAddress, userAgent, ipAddress);
      
      if (result.success) {
        res.json({
          message: 'Wallet login successful',
          user: {
            id: result.user!.id,
            email: result.user!.email,
            username: result.user!.username,
            name: result.user!.name,
            role: result.user!.role,
            walletAddress: result.user!.walletAddress
          },
          token: result.token,
          refreshToken: result.refreshToken
        });
      } else {
        res.status(401).json({ error: result.error });
      }
    } catch (error) {
      console.error('Wallet login controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const result = await authService.refreshToken(refreshToken);
      
      if (result.success) {
        res.json({
          token: result.token,
          refreshToken: result.refreshToken,
          user: {
            id: result.user!.id,
            email: result.user!.email,
            username: result.user!.username,
            name: result.user!.name,
            role: result.user!.role
          }
        });
      } else {
        res.status(401).json({ error: result.error });
      }
    } catch (error) {
      console.error('Refresh token controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }

      const success = await authService.logout(token);
      
      if (success) {
        res.json({ message: 'Logout successful' });
      } else {
        res.status(400).json({ error: 'Logout failed' });
      }
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorMethod: user.twoFactorMethod,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async enableTwoFactor(req: Request, res: Response) {
    try {
      const { error, value } = enable2FASchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;
      const result = await authService.enableTwoFactor(user.id, value.method);
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: 'Two-factor authentication enabled',
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes
      });
    } catch (error) {
      console.error('Enable 2FA controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verifyTwoFactor(req: Request, res: Response) {
    try {
      const { error, value } = verify2FASchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;
      const isValid = await authService.verifyTwoFactor(user, value.code);
      
      if (isValid) {
        res.json({ message: 'Two-factor authentication verified' });
      } else {
        res.status(400).json({ error: 'Invalid two-factor code' });
      }
    } catch (error) {
      console.error('Verify 2FA controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
