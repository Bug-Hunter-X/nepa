# NEPA RESTful API Documentation

## Overview

The NEPA platform provides a comprehensive RESTful API following OpenAPI 3.0 specifications for decentralized utility payments, DeFi yield generation, and third-party integrations.

## Architecture

### API Versioning Strategy
- **v1**: Legacy API with basic functionality
- **v2**: Current version with enhanced features and OAuth 2.0
- **Latest**: Always points to v2 (current stable version)

### Base URLs
- **Production**: `https://api.nepa.com/v2`
- **Staging**: `https://staging-api.nepa.com/v2`
- **Sandbox**: `https://sandbox-api.nepa.com/v2`

### Authentication
- **OAuth 2.0**: Primary authentication method
- **JWT Bearer Tokens**: For API access
- **API Keys**: For service-to-service communication

## Core Features

### 1. Authentication & User Management
- OAuth 2.0 authorization flow
- User profile management
- Token refresh and verification
- Role-based access control

### 2. Payment Processing
- Utility bill payments
- Payment history and analytics
- Scheduled and bulk payments
- Multi-method payment support

### 3. DeFi Yield Generation
- Yield strategy management
- Position tracking and performance
- Automated strategy execution
- Risk assessment and monitoring

### 4. Credit Scoring Integration
- Credit score retrieval
- Fraud detection
- Credit monitoring and alerts
- Dispute management

### 5. Banking Integration
- Account linking and management
- Transaction processing
- Balance inquiries
- Account validation

### 6. Utility Provider Integration
- Provider discovery and linking
- Bill retrieval and payment
- Usage analytics and reporting
- Service outage monitoring

### 7. Analytics & Reporting
- Dashboard analytics
- Payment analytics
- Usage analytics
- Yield performance metrics

## API Endpoints

### Health Check
```
GET /api/health
GET /api/v2/health
```
Returns API health status, uptime, and service metrics.

### Authentication
```
POST /api/v2/auth/oauth/authorize
POST /api/v2/auth/oauth/token
GET /api/v2/auth/verify
```

### User Management
```
GET /api/v2/users/profile
PUT /api/v2/users/profile
GET /api/v2/users/preferences
PUT /api/v2/users/preferences
```

### Payments
```
GET /api/v2/payments/bills
POST /api/v2/payments/bills
GET /api/v2/payments/bills/{billId}
GET /api/v2/payments/history
POST /api/v2/payments/schedule
POST /api/v2/payments/bulk
```

### Yield Generation
```
GET /api/v2/yield/strategies
POST /api/v2/yield/deploy
POST /api/v2/yield/withdraw
GET /api/v2/yield/positions
GET /api/v2/yield/performance
POST /api/v2/yield/automated/start
POST /api/v2/yield/automated/stop
```

### Credit Scoring
```
GET /api/v2/credit/score
GET /api/v2/credit/report
POST /api/v2/credit/fraud/detect
GET /api/v2/credit/monitoring
```

### Banking Integration
```
GET /api/v2/banking/accounts
POST /api/v2/banking/link
POST /api/v2/banking/payments
GET /api/v2/banking/transactions
POST /api/v2/banking/validate
```

### Utility Providers
```
GET /api/v2/utilities/providers
POST /api/v2/utilities/link
GET /api/v2/utilities/bills
POST /api/v2/utilities/payments
GET /api/v2/utilities/usage
GET /api/v2/utilities/outages
```

### Analytics
```
GET /api/v2/analytics/dashboard
GET /api/v2/analytics/payments
GET /api/v2/analytics/usage
GET /api/v2/analytics/yield
```

## Request/Response Format

### Standard Response Structure
```json
{
  "success": true,
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-02-21T12:00:00Z",
    "requestId": "req_123456789",
    "version": "2.0.0",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Error Handling
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Endpoint not found
- **429 Too Many Requests**: Rate limiting
- **500 Internal Server Error**: Server errors

### Rate Limiting
- **Window**: 60 seconds
- **Max Requests**: 100 per window
- **Headers**: Rate limiting headers included

## Security Features

### Authentication
- OAuth 2.0 with PKCE
- JWT tokens with expiration
- Refresh token rotation
- Multi-factor authentication support

### Security Headers
- Content Security Policy (CSP)
- CORS configuration
- XSS protection
- Frame options

### Data Validation
- Request schema validation
- Input sanitization
- SQL injection prevention
- XSS protection

## Monitoring & Logging

### Request Logging
- Correlation IDs for request tracking
- Request/response timing
- User identification
- Error tracking

### Performance Monitoring
- Response time metrics
- Error rate monitoring
- Rate limiting tracking
- Service health checks

### Alerting
- Real-time error alerts
- Performance degradation alerts
- Security incident notifications

## Testing

### Test Suite Coverage
- Unit tests for all endpoints
- Integration tests for workflows
- Performance testing
- Security testing
- Load testing

### Test Data
- Mock data for consistent testing
- Test user accounts
- Test payment scenarios
- Error condition testing

## Documentation

### OpenAPI Specification
- **File**: `src/api/openapi.yaml`
- **Format**: OpenAPI 3.0.3
- **Tools**: Swagger UI, Postman Collection

### Interactive Documentation
- **Swagger UI**: `/api/docs/swagger`
- **Postman Collection**: `/api/docs/postman`
- **API Versioning**: `/api/docs`

## Development Setup

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.8",
    "typescript": "^5.6.2"
  }
}
```

### Environment Configuration
```bash
# Development
npm run dev

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Build
npm run build

# Production
npm start
```

## Best Practices

### API Design
- RESTful principles
- Consistent response formats
- Proper HTTP status codes
- Pagination support
- Filtering and sorting

### Security
- Input validation
- Authentication middleware
- Rate limiting
- Security headers

### Performance
- Response compression
- Request caching
- Database optimization
- CDN integration

### Monitoring
- Structured logging
- Performance metrics
- Error tracking
- Health checks

## Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.nepa.com/v2',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
});

// Get user profile
const profile = await apiClient.get('/users/profile');

// Pay bill
const payment = await apiClient.post('/payments/bills', {
  bill_id: 'bill-123',
  amount: 150.00,
  payment_method: 'bank_transfer'
});
```

### cURL
```bash
# Get user profile
curl -X GET "https://api.nepa.com/v2/users/profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Pay bill
curl -X POST "https://api.nepa.com/v2/payments/bills" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": "bill-123",
    "amount": 150.00,
    "payment_method": "bank_transfer"
  }'
```

## Deployment

### Production Considerations
- Load balancing
- Auto-scaling
- Database replication
- CDN configuration
- SSL/TLS termination

### Environment Variables
```env
NODE_ENV=production
PORT=3000
API_VERSION=2.0.0
CORS_ORIGINS=https://nepa.com,https://app.nepa.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## Support

### Documentation
- **API Docs**: https://docs.nepa.com
- **Swagger UI**: https://api.nepa.com/docs/swagger
- **Postman**: https://api.nepa.com/docs/postman

### Support Channels
- **Email**: support@nepa.com
- **Discord**: https://discord.gg/nepa
- **Status Page**: https://status.nepa.com

### API Status
- **Real-time**: https://status.nepa.com
- **Historical**: https://status.nepa.com/history

## Roadmap

### Upcoming Features
- GraphQL API
- WebSocket support for real-time updates
- Advanced analytics endpoints
- Enhanced security features
- Mobile SDKs

### Version History
- **v2.0.0**: Current version with all features
- **v1.0.0**: Legacy version (maintained for compatibility)
- **v0.9.0**: Beta version (deprecated)

This comprehensive RESTful API provides a robust foundation for the NEPA platform with proper versioning, security, monitoring, and documentation following industry best practices.
