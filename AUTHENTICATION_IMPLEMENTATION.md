# User Authentication and Authorization Implementation

This document describes the comprehensive user authentication and authorization system implemented for the NEPA project to address issue #56.

## Overview

The NEPA application now supports multiple authentication methods and provides a complete user management system with role-based access control, session management, and optional two-factor authentication.

## Features Implemented

### ✅ User Registration and Profile System
- Email-based user registration with password hashing
- User profiles with customizable preferences
- Username support with uniqueness validation
- Phone number support for 2FA
- Avatar and profile customization

### ✅ Role-Based Access Control (RBAC)
- Three user roles: USER, ADMIN, SUPER_ADMIN
- Hierarchical permission system
- Role-based route protection
- Admin user management endpoints

### ✅ Secure Session Management
- JWT-based authentication with refresh tokens
- Session tracking with device information
- Automatic token refresh
- Session revocation capabilities
- Secure session storage

### ✅ Two-Factor Authentication (2FA)
- Support for TOTP (Authenticator App)
- Email and SMS 2FA methods (framework ready)
- QR code generation for easy setup
- Backup codes for account recovery

### ✅ Wallet Authentication
- Stellar wallet integration (Freighter)
- Automatic user creation for wallet users
- Hybrid authentication (wallet + traditional)

### ✅ Enhanced Security Features
- Account lockout after failed attempts
- Password strength requirements
- Audit logging for all actions
- Rate limiting on auth endpoints
- Secure password hashing with bcrypt

## Architecture

### Backend Components

#### Database Schema Updates
- Enhanced User model with authentication fields
- UserSession model for session management
- UserProfile model for user preferences
- AuditLog model for security auditing
- Role and status enums for access control

#### Services
- `AuthenticationService`: Core authentication logic
- Password hashing and verification
- JWT token generation and validation
- 2FA setup and verification
- Session management

#### Controllers
- `AuthenticationController`: Auth endpoints
- `UserController`: User management
- Input validation with Joi
- Error handling and response formatting

#### Middleware
- `authentication.ts`: JWT verification and role checking
- Rate limiting for auth endpoints
- Request logging and audit trails

### Frontend Components

#### Services
- `authService.ts`: API communication
- Token management and refresh
- Automatic retry on token expiration

#### Context
- `AuthContext.tsx`: Global auth state
- User session management
- Authentication methods

#### Components
- `LoginForm.tsx`: Email/password login
- `RegisterForm.tsx`: User registration
- `AuthPage.tsx`: Unified auth interface
- Wallet integration with Freighter

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/wallet` - Wallet authentication
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/preferences` - Get preferences
- `PUT /api/user/preferences` - Update preferences
- `POST /api/user/change-password` - Change password

### Two-Factor Authentication
- `POST /api/user/2fa/enable` - Enable 2FA
- `POST /api/user/2fa/verify` - Verify 2FA code

### Session Management
- `GET /api/user/sessions` - List active sessions
- `DELETE /api/user/sessions/:id` - Revoke session

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

## Security Considerations

### Password Security
- Minimum 8 characters requirement
- bcrypt hashing with 12 rounds
- Password change functionality
- Secure password reset (to be implemented)

### Session Security
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Automatic token refresh
- Session invalidation on logout

### Rate Limiting
- Stricter limits on auth endpoints
- Account lockout after 5 failed attempts
- IP-based rate limiting
- DDoS protection integration

### Audit Trail
- All authentication events logged
- User action tracking
- IP and user agent logging
- Security event monitoring

## Setup Instructions

### Backend Setup

1. **Install Dependencies**
```bash
cd nepa
npm install bcryptjs jsonwebtoken speakeasy qrcode nodemailer express-session connect-redis joi uuid
npm install -D @types/bcryptjs @types/jsonwebtoken @types/speakeasy @types/qrcode @types/nodemailer @types/express-session @types/uuid
```

2. **Environment Variables**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nepa

# Email (for 2FA)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis (for sessions)
REDIS_URL=redis://localhost:6379
```

3. **Database Migration**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Start Development Server**
```bash
npm run dev
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd nepa-frontend
npm install
```

2. **Environment Variables**
```env
REACT_APP_API_URL=http://localhost:3000/api
```

3. **Start Development Server**
```bash
npm run dev
```

## Usage Examples

### User Registration
```javascript
const registerData = {
  email: 'user@example.com',
  password: 'securePassword123',
  username: 'johndoe',
  name: 'John Doe'
};

const result = await authService.register(registerData);
```

### Email Login
```javascript
const loginData = {
  email: 'user@example.com',
  password: 'securePassword123'
};

const result = await authService.login(loginData);
```

### Wallet Login
```javascript
const result = await authService.loginWithWallet();
```

### Enabling 2FA
```javascript
const result = await authService.enableTwoFactor('AUTHENTICATOR_APP');
// Returns QR code and secret for user to scan
```

## Testing

### Authentication Flow Tests
1. User registration
2. Email verification
3. Login with correct credentials
4. Login with wrong credentials (should fail)
5. Token refresh
6. Logout and session invalidation

### 2FA Tests
1. Enable 2FA with authenticator app
2. Login with 2FA code
3. Login with wrong 2FA code (should fail)
4. Backup code recovery

### Role-Based Access Tests
1. Admin access to protected endpoints
2. User access denied to admin endpoints
3. Role hierarchy enforcement

## Future Enhancements

### Planned Features
- Email verification system
- Password reset functionality
- SMS 2FA implementation
- OAuth integration (Google, GitHub)
- Advanced audit dashboard
- Biometric authentication support

### Security Improvements
- Advanced threat detection
- Device fingerprinting
- Anomaly detection
- IP whitelisting
- Advanced rate limiting

## Troubleshooting

### Common Issues

1. **Token Not Found**
   - Check if token is stored in localStorage
   - Verify token is not expired
   - Check network connectivity

2. **2FA Verification Failed**
   - Ensure time sync on device
   - Check backup codes if available
   - Verify TOTP secret is correct

3. **Wallet Connection Issues**
   - Ensure Freighter is installed
   - Check wallet is unlocked
   - Verify network settings

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=auth:*
```

## Contributing

When contributing to the authentication system:

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation
4. Consider edge cases
5. Implement proper error handling

## License

This authentication implementation follows the same license as the NEPA project.
