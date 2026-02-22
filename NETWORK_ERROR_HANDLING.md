# Network Error Handling Implementation

This document describes the comprehensive network error handling solution implemented for the NEPA dapp and frontend to address the issue of poor error handling for network connectivity issues, RPC failures, and Stellar network timeouts.

## Overview

The implementation provides:
- **Network Status Detection**: Real-time monitoring of network connectivity
- **Comprehensive Error Classification**: Categorization of different error types
- **Automatic Retry Logic**: Exponential backoff for transient failures
- **User-Friendly Error Messages**: Clear, actionable error descriptions
- **Offline Detection**: Graceful handling when network is unavailable

## Architecture

### Core Components

1. **NetworkStatusService** (`src/services/networkStatusService.ts`)
   - Monitors network connectivity in real-time
   - Detects online, offline, slow, and unstable connections
   - Provides metrics and status change notifications

2. **ErrorHandler** (`src/utils/errorHandler.ts`)
   - Classifies errors into specific types
   - Implements retry logic with exponential backoff
   - Provides user-friendly error messages
   - Offers utility functions for common error handling patterns

3. **ErrorDisplay Component** (`src/components/ErrorDisplay.tsx`)
   - React component for displaying errors to users
   - Context-aware error messages based on network status
   - Retry functionality with attempt counting

4. **Enhanced Hooks**
   - Updated `useStellar` and `useWallet` hooks
   - Integrated error handling and retry logic
   - Network status awareness

5. **Stellar Integration** (`nepa-dapp/src/api/stellar-integration.ts`)
   - Enhanced Stellar API integration with error handling
   - Specific error handling for blockchain operations
   - Comprehensive logging and metrics

## Error Types

The system categorizes errors into the following types:

| Error Type | Description | Retryable | Example |
|-------------|-------------|------------|----------|
| `NETWORK_ERROR` | Connection failures, DNS issues | ✅ | "Failed to fetch" |
| `TIMEOUT_ERROR` | Request timeouts | ✅ | "Request timeout" |
| `VALIDATION_ERROR` | Invalid input/data | ❌ | "Invalid address format" |
| `SERVER_ERROR` | 5xx server errors | ✅ | "Internal server error" |
| `AUTHENTICATION_ERROR` | 401/403 auth failures | ❌ | "Unauthorized" |
| `RATE_LIMIT_ERROR` | 429 rate limiting | ✅ | "Too many requests" |
| `UNKNOWN_ERROR` | Unclassified errors | ❌ | "Unexpected error" |

## Network Status Detection

The `NetworkStatusService` continuously monitors network connectivity:

```typescript
// Initialize network monitoring
const networkService = new NetworkStatusService({
  checkInterval: 30000,      // Check every 30 seconds
  timeoutThreshold: 10000,   // 10 second timeout
  slowConnectionThreshold: 3000, // 3 second slow threshold
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoffMultiplier: 2
});

// Listen for status changes
const unsubscribe = networkService.onStatusChange((status) => {
  console.log('Network status changed:', status);
});

// Check current status
const isOnline = networkService.isOnline();
const status = networkService.getStatus();
```

## Error Handling Patterns

### Basic Error Classification

```typescript
import { ErrorHandler } from '../utils/errorHandler';

try {
  await someNetworkOperation();
} catch (error) {
  const networkError = ErrorHandler.classifyError(error);
  
  if (networkError.isRetryable) {
    // Retry the operation
    await ErrorHandler.retryWithBackoff(someNetworkOperation);
  } else {
    // Show user-friendly error
    const errorMessage = ErrorHandler.createUserFriendlyMessage(networkError);
    showErrorToUser(errorMessage);
  }
}
```

### Retry with Exponential Backoff

```typescript
const result = await ErrorHandler.retryWithBackoff(
  async () => {
    return await api.submitTransaction(transaction);
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
);
```

### Hook Usage

```typescript
import { useStellar } from '../hooks/useStellar';

function PaymentComponent() {
  const { 
    sendPayment, 
    error, 
    status, 
    networkStatus, 
    isOnline, 
    retryCount,
    retryLastOperation 
  } = useStellar();

  const handlePayment = async (paymentData) => {
    await sendPayment(paymentData);
  };

  return (
    <div>
      {error && (
        <ErrorDisplay
          error={error}
          networkStatus={networkStatus}
          onRetry={retryLastOperation}
          retryCount={retryCount}
        />
      )}
      
      <button 
        onClick={handlePayment}
        disabled={!isOnline || status === 'loading'}
      >
        {status === 'loading' ? 'Processing...' : 'Send Payment'}
      </button>
    </div>
  );
}
```

## Integration Examples

### Stellar Operations

```typescript
import { StellarIntegration } from '../api/stellar-integration';

const stellar = new StellarIntegration({
  horizonUrl: 'https://horizon-testnet.stellar.org',
  passphrase: 'Test SDF Network ; September 2015',
  network: 'testnet',
  timeout: 30000,
  maxRetries: 3
});

const paymentResponse = await stellar.sendPayment({
  from: 'GD...',
  to: 'GB...',
  amount: '10',
  asset: 'XLM'
});

if (!paymentResponse.success) {
  console.error('Payment failed:', paymentResponse.error);
}
```

### API Integration

```typescript
import { IntegrationLayer } from '../api/integration-layer';

const api = new IntegrationLayer({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
});

const response = await api.get('/data');
if (!response.success) {
  // Error is already classified and logged
  console.error('API call failed:', response.error);
}
```

## User Experience Improvements

### Before Implementation
- Generic "Payment failed" messages
- No retry mechanism
- No distinction between error types
- No offline detection
- Poor user guidance

### After Implementation
- **Specific Error Messages**: "Network Connection Error: Unable to connect to the server. Please check your internet connection."
- **Automatic Retry**: Failed operations automatically retry with exponential backoff
- **Offline Detection**: Clear indication when user is offline
- **Retry Controls**: User can manually retry with attempt counting
- **Contextual Actions**: Different actions based on error type (refresh page, check connection, etc.)

## Testing

Comprehensive tests are provided in `src/tests/errorHandling.test.ts`:

```bash
# Run error handling tests
npm test -- errorHandling.test.ts
```

Test coverage includes:
- Network status detection
- Error classification
- Retry mechanism
- Error message generation
- Integration scenarios

## Configuration

### Network Status Service

```typescript
const config = {
  checkInterval: 30000,           // How often to check network (ms)
  timeoutThreshold: 10000,        // Consider slow if > 10s
  slowConnectionThreshold: 3000,   // Consider slow if > 3s
  maxRetries: 3,                  // Max retry attempts
  retryDelay: 1000,               // Base retry delay (ms)
  retryBackoffMultiplier: 2         // Exponential backoff multiplier
};
```

### Error Handler

```typescript
const retryConfig = {
  maxRetries: 3,                  // Maximum retry attempts
  baseDelay: 1000,                // Base delay between retries
  maxDelay: 30000,                // Maximum delay cap
  backoffMultiplier: 2,            // Exponential backoff multiplier
  retryableErrors: [               // Which errors to retry
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.SERVER_ERROR
  ]
};
```

## Monitoring and Metrics

The system provides comprehensive metrics:

```typescript
const metrics = networkService.getMetrics();
console.log('Network Metrics:', {
  status: metrics.status,
  responseTime: metrics.responseTime,
  consecutiveFailures: metrics.consecutiveFailures,
  totalRequests: metrics.totalRequests,
  successfulRequests: metrics.successfulRequests,
  failedRequests: metrics.failedRequests,
  averageResponseTime: metrics.averageResponseTime
});
```

## Best Practices

1. **Always check network status before operations**
2. **Use retry logic for transient failures**
3. **Provide specific error messages**
4. **Log errors for debugging**
5. **Handle offline state gracefully**
6. **Show retry attempts to users**
7. **Distinguish between retryable and non-retryable errors**

## Files Modified/Created

### Frontend (`nepa-frontend/src/`)
- `services/networkStatusService.ts` - Network monitoring
- `utils/errorHandler.ts` - Error classification and retry logic
- `components/ErrorDisplay.tsx` - Error display component
- `hooks/useStellar.ts` - Enhanced with error handling
- `hooks/useWallet.ts` - Enhanced with error handling
- `types/index.ts` - Updated type definitions
- `tests/errorHandling.test.ts` - Comprehensive tests

### DApp (`nepa-dapp/src/`)
- `api/stellar-integration.ts` - Enhanced Stellar integration

## Conclusion

This implementation addresses all the issues mentioned in the GitHub issue:

✅ **No retry mechanism for failed transactions** - Implemented with exponential backoff
✅ **Generic error messages** - Replaced with specific, user-friendly messages
✅ **No distinction between network errors and validation errors** - Comprehensive error classification
✅ **No offline detection or handling** - Real-time network monitoring
✅ **Graceful degradation when network is unavailable** - Offline-aware UI components

The solution provides a robust, user-friendly error handling system that significantly improves the user experience when dealing with network connectivity issues.
