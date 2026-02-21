# NEPA GraphQL API Documentation

## Overview

The NEPA platform provides a comprehensive GraphQL API for flexible data queries, real-time subscriptions, and efficient data fetching with advanced caching and optimization features.

## Architecture

### GraphQL Server
- **Apollo Server 4**: Modern GraphQL server with built-in caching and subscriptions
- **Type Safety**: Full TypeScript integration with generated types
- **Performance**: Query optimization, caching, and DataLoader integration
- **Real-time**: WebSocket subscriptions for live updates

### Core Features
- **Flexible Queries**: Fetch exactly what you need, no over-fetching
- **Real-time Subscriptions**: Live updates for payments, bills, yield positions
- **Advanced Caching**: Multi-layer caching with Redis and in-memory options
- **Authentication**: JWT-based auth with role-based access control
- **Rate Limiting**: Intelligent rate limiting per user and operation
- **Monitoring**: Comprehensive query performance monitoring

## Schema Design

### Type System
The GraphQL schema follows a modular design with:

- **User Management**: Profile, preferences, authentication
- **Utility Bills**: Bills, providers, accounts, payments
- **Banking Integration**: Accounts, transactions, validations
- **Yield Generation**: Strategies, positions, performance metrics
- **Credit Scoring**: Scores, reports, fraud detection
- **Analytics**: Comprehensive analytics and reporting
- **Notifications**: Real-time alerts and notifications

### Custom Scalars
```graphql
scalar Date          # YYYY-MM-DD format
scalar DateTime      # ISO 8601 datetime
scalar BigInt         # Large integer values
scalar Decimal        # Financial amounts
scalar JSON           # Flexible JSON data
```

### Key Types

#### User
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  phone: String
  role: UserRole!
  address: Address
  preferences: UserPreferences!
  createdAt: DateTime!
  updatedAt: DateTime!
  lastLoginAt: DateTime
  isEmailVerified: Boolean!
  isPhoneVerified: Boolean!
  twoFactorEnabled: Boolean!
}
```

#### UtilityBill
```graphql
type UtilityBill {
  id: ID!
  billNumber: String!
  provider: UtilityProvider!
  serviceType: ServiceType!
  account: UtilityAccount!
  period: BillingPeriod!
  dueDate: Date!
  amount: Decimal!
  currency: String!
  status: BillStatus!
  usage: UsageData!
  rates: RateStructure!
  paymentMethods: [PaymentMethod!]!
  pdfUrl: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Payment
```graphql
type Payment {
  id: ID!
  bill: UtilityBill!
  user: User!
  amount: Decimal!
  currency: String!
  method: PaymentMethod!
  status: PaymentStatus!
  fees: Decimal!
  transactionId: String
  reference: String
  scheduledDate: DateTime
  processedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  metadata: JSON
}
```

#### YieldPosition
```graphql
type YieldPosition {
  id: ID!
  user: User!
  strategy: YieldStrategy!
  amount: Decimal!
  asset: String!
  currentAPR: Float!
  earnedYield: Decimal!
  netAPY: Float!
  impermanentLoss: Decimal!
  status: PositionStatus!
  startTime: DateTime!
  endTime: DateTime
  lastUpdated: DateTime!
  performance: PositionPerformance!
}
```

## Query Operations

### Basic Queries
```graphql
# Get current user
query {
  me {
    id
    name
    email
    preferences {
      theme
      notifications
      currency
    }
  }
}

# Get user's bills
query GetBills($filter: BillFilterInput, $pagination: PaginationInput) {
  bills(filter: $filter, pagination: $pagination) {
    id
    billNumber
    amount
    dueDate
    status
    provider {
      name
      type
    }
  }
}

# Get payment history
query GetPayments($filter: PaymentFilterInput) {
  payments(filter: $filter) {
    id
    amount
    method
    status
    processedAt
    bill {
      billNumber
      dueDate
    }
  }
}
```

### Advanced Queries
```graphql
# Get comprehensive dashboard data
query GetDashboard {
  analytics {
    dashboard {
      overview {
        totalPayments
        totalYield
        activePositions
        creditScore
        monthlySavings
        upcomingBills
      }
      charts {
        id
        title
        type
        data
      }
    }
  }
}

# Get yield performance with nested data
query GetYieldPerformance($positionId: ID!) {
  yieldPosition(id: $positionId) {
    id
    amount
    currentAPR
    earnedYield
    performance {
      totalReturn
      annualizedReturn
      volatility
      sharpeRatio
      maxDrawdown
      winRate
    }
    strategy {
      name
      riskLevel
      expectedAPR
    }
  }
}
```

## Mutation Operations

### Authentication
```graphql
# Login
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    refreshToken
    user {
      id
      name
      email
      role
    }
    expiresIn
  }
}

# Update profile
mutation UpdateProfile($input: UserProfileInput!) {
  updateProfile(input: $input) {
    id
    name
    email
    phone
    address {
      street
      city
      state
      zipCode
      country
    }
  }
}
```

### Payments
```graphql
# Create payment
mutation CreatePayment($input: PaymentInput!) {
  createPayment(input: $input) {
    id
    amount
    status
    fees
    transactionId
    processedAt
  }
}

# Schedule payment
mutation SchedulePayment($input: PaymentInput!) {
  schedulePayment(input: $input) {
    id
    scheduledDate
    status
  }
}
```

### Yield Generation
```graphql
# Deploy to yield strategy
mutation DeployYield($input: YieldDeploymentInput!) {
  deployYield(input: $input) {
    id
    amount
    currentAPR
    status
    startTime
  }
}

# Withdraw from yield position
mutation WithdrawYield($positionId: ID!, $amount: Decimal) {
  withdrawYield(positionId: $positionId, amount: $amount) {
    id
    status
    endTime
  }
}
```

## Subscription Operations

### Real-time Updates
```graphql
# Payment updates
subscription PaymentUpdates($userId: ID!) {
  paymentUpdated(userId: $userId) {
    id
    status
    processedAt
    amount
    bill {
      billNumber
      dueDate
    }
  }
}

# Bill updates
subscription BillUpdates($userId: ID!) {
  billUpdated(userId: $userId) {
    id
    status
    amount
    dueDate
    usage {
      current
      previous
    }
  }
}

# Yield position updates
subscription YieldUpdates($userId: ID!) {
  yieldPositionUpdated(userId: $userId) {
    id
    currentAPR
    earnedYield
    status
    performance {
      totalReturn
      annualizedReturn
    }
  }
}

# Notifications
subscription Notifications($userId: ID!) {
  notificationReceived(userId: $userId) {
    id
    type
    severity
    title
    message
    createdAt
  }
}
```

## Authentication & Authorization

### JWT Authentication
```graphql
# Include token in headers
Authorization: Bearer <jwt_token>
```

### Role-based Access Control
- **USER**: Access to own data
- **ADMIN**: Access to all data and admin operations
- **SERVICE_PROVIDER**: Limited access to provider-specific data
- **ANALYST**: Read-only access to analytics

### Auth Directives
```graphql
# Require authentication
query {
  me @auth {
    id
    name
  }
}

# Require specific role
mutation {
  adminOperation @auth(requires: ADMIN) {
    id
    result
  }
}
```

## Caching & Optimization

### Query Caching
- **Automatic Caching**: Frequently accessed queries cached automatically
- **TTL Configuration**: Configurable time-to-live per query type
- **Cache Invalidation**: Smart invalidation on data changes
- **Multi-layer**: Memory + Redis for optimal performance

### Query Optimization
```graphql
# Use field selection for efficiency
query OptimizedQuery {
  user(id: "user-1") {
    id
    name
    email
    # Only fetch needed fields
  }
}

# Use aliases for multiple queries
query MultipleQueries {
  bills: bills(limit: 10) {
    id
    amount
  }
  payments: payments(limit: 10) {
    id
    status
  }
}
```

### DataLoader Integration
- **Batch Loading**: Automatic batching of database queries
- **Caching**: Built-in result caching
- **Deduplication**: Eliminates duplicate requests

## Rate Limiting

### Rate Limiting Rules
- **Per User**: 100 requests per minute
- **Per IP**: 1000 requests per minute
- **Complex Queries**: Higher cost for complex operations
- **Subscriptions**: Separate limits for subscription connections

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Format
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "code": "UNAUTHORIZED",
      "path": ["me"],
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "extensions": {
        "timestamp": "2024-01-01T12:00:00Z",
        "requestId": "req_123456789"
      }
    }
  ],
  "data": null
}
```

### Error Codes
- **UNAUTHORIZED**: Authentication required
- **FORBIDDEN**: Insufficient permissions
- **VALIDATION_ERROR**: Invalid input data
- **NOT_FOUND**: Resource not found
- **RATE_LIMIT_EXCEEDED**: Rate limit exceeded
- **INTERNAL_ERROR**: Server error

## Performance Monitoring

### Query Metrics
- **Response Time**: Query execution time
- **Complexity**: Query complexity score
- **Cache Hit Rate**: Cache effectiveness
- **Error Rate**: Error frequency

### Monitoring Endpoints
```graphql
# Health check
query {
  systemHealth {
    status
    timestamp
    uptime
    services {
      name
      status
      responseTime
    }
    metrics {
      totalRequests
      errorRate
      averageResponseTime
    }
  }
}
```

## Development Tools

### GraphQL Playground
- **URL**: `http://localhost:4000/playground`
- **Features**: Interactive query explorer, schema documentation
- **Authentication**: Set headers in playground UI

### Schema Introspection
```graphql
# Get full schema
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      description
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
}
```

### Type Generation
```bash
# Generate TypeScript types from schema
npx graphql-codegen
```

## Testing

### Test Suite Structure
- **Unit Tests**: Individual resolver testing
- **Integration Tests**: Full query/mutation testing
- **Subscription Tests**: Real-time update testing
- **Performance Tests**: Load and stress testing

### Example Test
```typescript
import { gql } from 'apollo-server-core';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

test('should get user by ID', async () => {
  const response = await server.execute({
    query: GET_USER,
    variables: { id: 'user-1' }
  });

  expect(response.errors).toBeUndefined();
  expect(response.data?.user.id).toBe('user-1');
});
```

## Best Practices

### Query Design
1. **Select Only Needed Fields**: Avoid over-fetching
2. **Use Variables**: Parameterize queries for reusability
3. **Batch Operations**: Combine multiple operations when possible
4. **Avoid Deep Nesting**: Limit query depth for performance

### Subscription Design
1. **Filter Subscriptions**: Subscribe only to needed events
2. **Handle Disconnections**: Implement reconnection logic
3. **Limit Data**: Send only essential data in updates
4. **Use Timeouts**: Handle subscription timeouts

### Performance Optimization
1. **Enable Caching**: Use appropriate cache settings
2. **Monitor Complexity**: Track query complexity scores
3. **Use DataLoader**: Implement for database access
4. **Optimize Resolvers**: Efficient data fetching

## Deployment

### Environment Configuration
```typescript
const config = {
  port: 4000,
  environment: 'production',
  corsOrigins: ['https://nepa.com'],
  rateLimit: {
    windowMs: 60000,
    max: 100
  },
  cache: {
    enabled: true,
    ttl: 300,
    maxSize: 10000,
    redis: {
      host: 'redis-cluster',
      port: 6379
    }
  },
  subscriptions: {
    enabled: true,
    maxConnections: 1000
  }
};
```

### Production Considerations
- **Load Balancing**: Multiple GraphQL server instances
- **CDN**: GraphQL Playground and static assets
- **Monitoring**: Comprehensive logging and metrics
- **Security**: Rate limiting, authentication, validation

## Client Integration

### Apollo Client
```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: createHttpLink({
    uri: 'https://api.nepa.com/graphql',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }),
  cache: new InMemoryCache()
});
```

### React Integration
```typescript
import { useQuery, useSubscription } from '@apollo/client';

const UserProfile = () => {
  const { data, loading, error } = useQuery(GET_USER_PROFILE);
  
  const { data: notificationData } = useSubscription(
    NOTIFICATION_SUBSCRIPTION,
    { variables: { userId: currentUserId } }
  );

  // Component logic
};
```

## Roadmap

### Upcoming Features
- **GraphQL Federation**: Multi-service architecture
- **Persisted Queries**: Pre-registered query optimization
- **Advanced Analytics**: Query performance analytics
- **Enhanced Caching**: Machine learning-based cache optimization
- **Real-time Collaboration**: Multi-user real-time features

### Version History
- **v2.0**: Current version with all features
- **v1.0**: Basic GraphQL implementation (deprecated)

This comprehensive GraphQL API provides flexible, efficient, and real-time data access for the NEPA platform with advanced caching, authentication, and monitoring capabilities.
