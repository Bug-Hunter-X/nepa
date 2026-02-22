# Testing Documentation

## Overview

This document provides comprehensive information about the testing setup and practices implemented for the NEPA project.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── controllers/         # Controller tests
│   ├── services/           # Service tests
│   ├── hooks/              # React hook tests
│   └── helpers/            # Test helpers and utilities
├── integration/            # Integration tests
│   ├── auth.test.ts        # Authentication API tests
│   ├── payment.test.ts     # Payment API tests
│   └── analytics.test.ts  # Analytics API tests
├── e2e/                   # End-to-end tests
│   ├── auth.spec.ts        # Authentication flows
│   ├── payment.spec.ts     # Payment flows
│   ├── dashboard.spec.ts   # Dashboard functionality
│   └── accessibility.spec.ts # Accessibility & performance
├── helpers.ts             # Shared test utilities
├── mocks.ts               # Mock objects and factories
├── setup.ts               # Test environment setup
├── globalSetup.ts         # Global test setup
└── globalTeardown.ts      # Global test teardown
```

## Testing Frameworks

### Jest (Unit & Integration Tests)
- **Framework**: Jest with TypeScript support
- **Coverage**: Configured for >80% coverage requirement
- **Mocking**: Built-in Jest mocking capabilities
- **Test Environment**: Node.js for backend tests

### Playwright (E2E Tests)
- **Framework**: Playwright for cross-browser E2E testing
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Features**: Automatic waiting, network interception, accessibility testing

## Test Categories

### Unit Tests
- **Purpose**: Test individual functions and classes in isolation
- **Coverage**: Services, controllers, utilities, hooks
- **Mocking**: External dependencies are mocked
- **Speed**: Fast execution, suitable for TDD

### Integration Tests
- **Purpose**: Test API endpoints with real database interactions
- **Coverage**: HTTP routes, middleware, database operations
- **Environment**: Test database with isolated transactions
- **Authentication**: Real JWT tokens and API keys

### End-to-End Tests
- **Purpose**: Test complete user workflows
- **Coverage**: Critical user journeys, cross-browser compatibility
- **Environment**: Full application stack
- **Features**: Accessibility, performance, responsive design

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Database Setup

### Environment Variables
- **Test Database**: PostgreSQL test instance
- **Redis**: Separate Redis database for testing
- **Environment**: `NODE_ENV=test`

### Database Management
- **Isolation**: Each test runs in a transaction
- **Cleanup**: Automatic cleanup after each test
- **Seeding**: Test helpers for creating test data

## Mocking Strategy

### Services
- **Prisma**: Mocked for unit tests
- **External APIs**: Mocked with Jest
- **File System**: Mocked for file operations

### Test Data
- **Factories**: Helper functions for creating test entities
- **Fixtures**: Pre-defined test scenarios
- **Randomization**: Dynamic test data generation

## Coverage Requirements

### Minimum Coverage
- **Overall**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports
- **Format**: LCOV, HTML, Text
- **Integration**: Codecov for CI/CD
- **Threshold**: Enforced in CI pipeline

## CI/CD Integration

### GitHub Actions
- **Triggers**: Push to main/develop, Pull Requests
- **Matrix**: Multiple Node.js versions
- **Services**: PostgreSQL, Redis
- **Parallel**: Unit, integration, and security tests

### Test Stages
1. **Linting**: Code quality checks
2. **Type Checking**: TypeScript compilation
3. **Unit Tests**: Fast feedback
4. **Integration Tests**: API validation
5. **Security Audit**: Dependency scanning
6. **E2E Tests**: Full workflow validation
7. **Coverage**: Quality gates

## Best Practices

### Test Organization
- **Descriptive Names**: Clear test descriptions
- **Arrange-Act-Assert**: Structured test patterns
- **Single Responsibility**: One assertion per test
- **Test Isolation**: Independent test execution

### Mock Management
- **Reset**: Clean mocks between tests
- **Realistic**: Mock behavior mirrors real implementations
- **Verification**: Ensure mocks are called correctly

### Error Handling
- **Edge Cases**: Test failure scenarios
- **Validation**: Input validation testing
- **Recovery**: Error recovery mechanisms

## Performance Testing

### Load Testing
- **Concurrent Users**: Multiple simultaneous requests
- **Response Times**: Performance thresholds
- **Resource Usage**: Memory and CPU monitoring

### Accessibility Testing
- **WCAG Compliance**: Accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Assistive technology compatibility

## Debugging Tests

### Unit Tests
```bash
npm run test:unit -- --testNamePattern="specific test"
```

### Integration Tests
```bash
npm run test:integration -- --detectOpenHandles
```

### E2E Tests
```bash
npm run test:e2e -- --debug
```

## Troubleshooting

### Common Issues
- **Database Connection**: Ensure test database is running
- **Port Conflicts**: Use different ports for parallel tests
- **Timeouts**: Increase timeout for slow operations
- **Memory Leaks**: Monitor memory usage in long-running tests

### Debug Mode
- **Verbose Output**: Use `--verbose` flag
- **Breakpoints**: Use `debugger` statements
- **Screenshots**: E2E tests capture screenshots on failure

## Maintenance

### Regular Updates
- **Dependencies**: Keep testing frameworks updated
- **Test Data**: Refresh test scenarios regularly
- **Coverage**: Monitor coverage trends

### Review Process
- **Code Review**: All tests reviewed before merge
- **Flaky Tests**: Identify and fix unreliable tests
- **Performance**: Monitor test execution times
