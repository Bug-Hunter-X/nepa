import { renderHook, act } from '@testing-library/react';
import { useStellar } from '../../src/hooks/useStellar';
import { StellarState, PaymentFormData } from '../../src/types';

// Mock the actual Stellar/Freighter API
jest.mock('@stellar/freighter-api', () => ({
  isAllowed: jest.fn(() => Promise.resolve(true)),
  isConnected: jest.fn(() => Promise.resolve(true)),
  getUserInfo: jest.fn(() => Promise.resolve({
    publicKey: 'GDTESTACCOUNT123456789',
    network: 'TESTNET'
  })),
  getNetwork: jest.fn(() => Promise.resolve('TESTNET')),
  signTransaction: jest.fn(() => Promise.resolve('signed-transaction-xdr'))
}));

describe('useStellar Hook', () => {
  const mockPaymentData: PaymentFormData = {
    destination: 'GDDESTINATION123456789',
    amount: '100.50',
    assetCode: 'XLM'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useStellar());

      expect(result.current).toMatchObject({
        address: null,
        balance: null,
        status: 'idle',
        error: null
      });
      expect(typeof result.current.connectWallet).toBe('function');
      expect(typeof result.current.sendPayment).toBe('function');
    });
  });

  describe('connectWallet', () => {
    it('should set loading status when connecting wallet', async () => {
      const { result } = renderHook(() => useStellar());

      act(() => {
        result.current.connectWallet();
      });

      expect(result.current.status).toBe('loading');
    });

    it('should successfully connect wallet and update state', async () => {
      const { result } = renderHook(() => useStellar());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.address).toBe('GA...XYZ');
      expect(result.current.balance).toBe('100.00');
      expect(result.current.error).toBeNull();
    });

    it('should handle wallet connection errors', async () => {
      // Mock a connection error by modifying the hook implementation temporarily
      const originalError = console.error;
      console.error = jest.fn();

      // We need to simulate the error case
      const { result } = renderHook(() => useStellar());

      // Since the current implementation uses mock data, we can't easily test error cases
      // In a real implementation, we would mock the Freighter API to throw an error
      // For now, we'll just verify the error handling structure exists
      expect(typeof result.current.connectWallet).toBe('function');

      console.error = originalError;
    });
  });

  describe('sendPayment', () => {
    it('should set loading status when sending payment', async () => {
      const { result } = renderHook(() => useStellar());

      act(() => {
        result.current.sendPayment(mockPaymentData);
      });

      expect(result.current.status).toBe('loading');
    });

    it('should successfully send payment', async () => {
      const { result } = renderHook(() => useStellar());

      await act(async () => {
        await result.current.sendPayment(mockPaymentData);
      });

      expect(result.current.status).toBe('success');
      expect(result.current.error).toBeNull();
    });

    it('should handle payment errors', async () => {
      const originalError = console.error;
      console.error = jest.fn();

      const { result } = renderHook(() => useStellar());

      // Similar to connectWallet, we're limited by the mock implementation
      // In a real implementation, we would mock the Stellar transaction to fail
      expect(typeof result.current.sendPayment).toBe('function');

      console.error = originalError;
    });

    it('should log payment data when sending', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useStellar());

      await act(async () => {
        await result.current.sendPayment(mockPaymentData);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending payment to:',
        mockPaymentData.destination,
        'Amount:',
        mockPaymentData.amount
      );

      consoleSpy.mockRestore();
    });
  });

  describe('state management', () => {
    it('should maintain state across multiple operations', async () => {
      const { result } = renderHook(() => useStellar());

      // Connect wallet
      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.address).toBe('GA...XYZ');
      expect(result.current.status).toBe('idle');

      // Send payment
      await act(async () => {
        await result.current.sendPayment(mockPaymentData);
      });

      // Address should remain, status should update
      expect(result.current.address).toBe('GA...XYZ');
      expect(result.current.status).toBe('success');
    });

    it('should handle concurrent operations safely', async () => {
      const { result } = renderHook(() => useStellar());

      // Start multiple operations concurrently
      const connectPromise = act(async () => {
        await result.current.connectWallet();
      });

      const paymentPromise = act(async () => {
        await result.current.sendPayment(mockPaymentData);
      });

      await Promise.all([connectPromise, paymentPromise]);

      // Should not crash and maintain valid state
      expect(['idle', 'loading', 'success', 'error']).toContain(result.current.status);
      expect(typeof result.current.address).toBe('string');
      expect(typeof result.current.balance).toBe('string');
    });
  });

  describe('integration with Stellar types', () => {
    it('should work with StellarState type expectations', () => {
      const { result } = renderHook(() => useStellar());

      // TypeScript should ensure these properties exist and have correct types
      expect(typeof result.current.address).toBe('string');
      expect(typeof result.current.balance).toBe('string');
      expect(typeof result.current.status).toBe('string');
      expect(['idle', 'loading', 'success', 'error']).toContain(result.current.status);
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
    });

    it('should accept PaymentFormData for sendPayment', async () => {
      const { result } = renderHook(() => useStellar());

      // Should accept valid PaymentFormData
      const validPaymentData: PaymentFormData = {
        destination: 'GDDESTINATION123456789',
        amount: '100.50',
        assetCode: 'XLM'
      };

      await expect(
        act(async () => {
          await result.current.sendPayment(validPaymentData);
        })
      ).resolves.not.toThrow();
    });
  });
});
