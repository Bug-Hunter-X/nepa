import { Request, Response } from 'express';
import { PrismaClient, UserStatus, UserRole } from '@prisma/client';
import Joi from 'joi';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  avatar: Joi.string().uri().optional()
});

const updatePreferencesSchema = Joi.object({
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(100).optional(),
  website: Joi.string().uri().optional(),
  timezone: Joi.string().optional(),
  language: Joi.string().optional(),
  currency: Joi.string().optional(),
  theme: Joi.string().valid('light', 'dark', 'auto').optional(),
  preferences: Joi.object().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional()
});

export class UserController {
  async getAllUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      
      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (role) {
        where.role = role;
      }

      if (status) {
        where.status = status;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
            status: true,
            walletAddress: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            twoFactorEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: {
                bills: true,
                payments: true,
                sessions: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phoneNumber: true,
          avatar: true,
          role: true,
          status: true,
          walletAddress: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          twoFactorEnabled: true,
          twoFactorMethod: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          _count: {
            select: {
              bills: true,
              payments: true,
              sessions: true,
              auditLogs: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;
      const updateData: any = {};

      // Check if username is already taken
      if (value.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: value.username,
            id: { not: user.id }
          }
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      Object.assign(updateData, value);

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phoneNumber: true,
          avatar: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      const { error, value } = updatePreferencesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;

      const updatedProfile = await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: value,
        create: {
          userId: user.id,
          ...value
        }
      });

      res.json({
        message: 'Preferences updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPreferences(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const profile = await prisma.userProfile.findUnique({
        where: { userId: user.id }
      });

      res.json({ profile });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const user = (req as any).user;

      // Get current user with password hash
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true }
      });

      if (!currentUser?.passwordHash) {
        return res.status(400).json({ error: 'No password set for this account' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(value.currentPassword, currentUser.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(value.newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error, value } = updateUserRoleSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const currentUser = (req as any).user;

      // Check if current user has permission to update roles
      if (currentUser.role === UserRole.USER) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Prevent users from promoting themselves to higher roles
      if (currentUser.role === UserRole.ADMIN && value.role === UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Cannot promote to Super Admin' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          role: value.role,
          ...(value.status && { status: value.status })
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          status: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserSessions(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const sessions = await prisma.userSession.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ sessions });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      const session = await prisma.userSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;

      // Users can only delete themselves, admins can delete other users, super admins can delete anyone
      if (currentUser.role === UserRole.USER && currentUser.id !== id) {
        return res.status(403).json({ error: 'Cannot delete other users' });
      }

      if (currentUser.role === UserRole.ADMIN && currentUser.id !== id) {
        const targetUser = await prisma.user.findUnique({
          where: { id },
          select: { role: true }
        });

        if (targetUser?.role === UserRole.ADMIN || targetUser?.role === UserRole.SUPER_ADMIN) {
          return res.status(403).json({ error: 'Cannot delete admin users' });
        }
      }

      // Soft delete by setting status to INACTIVE
      await prisma.user.update({
        where: { id },
        data: { 
          status: UserStatus.INACTIVE,
          email: `deleted_${Date.now()}_${id}`,
          username: null,
          walletAddress: null
        }
      });

      // Deactivate all sessions
      await prisma.userSession.updateMany({
        where: { userId: id },
        data: { isActive: false }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
