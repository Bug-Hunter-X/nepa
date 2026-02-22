import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { apiLimiter, ddosDetector, checkBlockedIP, ipRestriction, progressiveLimiter, authLimiter } from './middleware/rateLimiter';
import { configureSecurity } from './middleware/security';
import { apiKeyAuth } from './middleware/auth';
import { authenticate, authorize, optionalAuth } from './middleware/authentication';
import { requestLogger } from './middleware/logger';
import { errorTracker } from './middleware/abuseDetection';
import { swaggerSpec } from './swagger';
import { upload } from './middleware/upload';
import { uploadDocument } from './controllers/DocumentController';
import { getDashboardData, generateReport, exportData } from './controllers/AnalyticsController';
import { applyPaymentSecurity, processPayment, getPaymentHistory, validatePayment } from './controllers/PaymentController';
import { AuthenticationController } from './controllers/AuthenticationController';
import { UserController } from './controllers/UserController';
import { UserRole } from '@prisma/client';

const app = express();

// Initialize controllers
const authController = new AuthenticationController();
const userController = new UserController();

// 1. Logging (should be first to capture all requests)
app.use(requestLogger);

// 2. DDoS Protection and IP Blocking
app.use(ddosDetector);
app.use(checkBlockedIP);
app.use(ipRestriction);

// 3. Security Headers & CORS
configureSecurity(app);

// 4. Body Parsing
app.use(express.json({ limit: '10kb' })); // Limit body size for security

// 5. Progressive Rate Limiting
app.use('/api', progressiveLimiter);

// 6. General API Rate Limiting
app.use('/api', apiLimiter);

// 7. Error tracking for abuse detection
app.use(errorTracker);

// 8. API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 9. Public Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// 10. Protected API Routes
app.use('/api', apiKeyAuth);

// Authentication endpoints with stricter rate limiting
app.post('/api/auth/register', authLimiter, authController.register.bind(authController));
app.post('/api/auth/login', authLimiter, authController.login.bind(authController));
app.post('/api/auth/wallet', authLimiter, authController.loginWithWallet.bind(authController));
app.post('/api/auth/refresh', authLimiter, authController.refreshToken.bind(authController));
app.post('/api/auth/logout', authenticate, authController.logout.bind(authController));

// User profile endpoints
app.get('/api/user/profile', authenticate, authController.getProfile.bind(authController));
app.put('/api/user/profile', authenticate, userController.updateProfile.bind(userController));
app.get('/api/user/preferences', authenticate, userController.getPreferences.bind(userController));
app.put('/api/user/preferences', authenticate, userController.updatePreferences.bind(userController));
app.post('/api/user/change-password', authenticate, userController.changePassword.bind(userController));

// Two-factor authentication endpoints
app.post('/api/user/2fa/enable', authenticate, authController.enableTwoFactor.bind(authController));
app.post('/api/user/2fa/verify', authenticate, authController.verifyTwoFactor.bind(authController));

// User sessions
app.get('/api/user/sessions', authenticate, userController.getUserSessions.bind(userController));
app.delete('/api/user/sessions/:sessionId', authenticate, userController.revokeSession.bind(userController));

// Admin user management endpoints
app.get('/api/admin/users', authenticate, authorize(UserRole.ADMIN), userController.getAllUsers.bind(userController));
app.get('/api/admin/users/:id', authenticate, authorize(UserRole.ADMIN), userController.getUserById.bind(userController));
app.put('/api/admin/users/:id/role', authenticate, authorize(UserRole.ADMIN), userController.updateUserRole.bind(userController));
app.delete('/api/admin/users/:id', authenticate, authorize(UserRole.ADMIN), userController.deleteUser.bind(userController));

// Payment endpoints with enhanced security
app.post('/api/payment/process', ...applyPaymentSecurity, processPayment);
app.get('/api/payment/history', apiKeyAuth, getPaymentHistory);
app.post('/api/payment/validate', ...applyPaymentSecurity, validatePayment);

// Example protected route
/**
 * @openapi
 * /api/test:
 *   get:
 *     summary: Test protected route
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/api/test', (req, res) => {
  res.json({ message: 'Authenticated access successful' });
});

// Document Upload Route
/**
 * @openapi
 * /api/documents/upload:
 *   post:
 *     summary: Upload a document
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
app.post('/api/documents/upload', apiKeyAuth, upload.single('file'), uploadDocument);

// Analytics Routes
/**
 * @openapi
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 */
app.get('/api/analytics/dashboard', apiKeyAuth, getDashboardData);

/**
 * @openapi
 * /api/analytics/reports:
 *   post:
 *     summary: Generate and save a custom report
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       201:
 *         description: Report created
 */
app.post('/api/analytics/reports', apiKeyAuth, generateReport);

// Export Route
app.get('/api/analytics/export', apiKeyAuth, exportData);

export default app;