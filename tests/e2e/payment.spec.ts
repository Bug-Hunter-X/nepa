import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should view bills and make a payment', async ({ page }) => {
    // Navigate to bills page
    await page.click('[data-testid="bills-nav"]');
    await expect(page).toHaveURL(/.*bills/);

    // Should see list of bills
    await expect(page.locator('[data-testid="bill-item"]')).toHaveCount.greaterThan(0);

    // Click on first bill
    await page.click('[data-testid="bill-item"]:first-child');

    // Should see bill details
    await expect(page.locator('[data-testid="bill-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="bill-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="due-date"]')).toBeVisible();

    // Click pay button
    await page.click('[data-testid="pay-bill-button"]');

    // Should be on payment page
    await expect(page).toHaveURL(/.*payment/);

    // Fill payment form
    await page.selectOption('[data-testid="payment-method"]', 'CREDIT_CARD');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Test User');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Should show success message
    await expect(page.locator('text=Payment successful')).toBeVisible();
    await expect(page).toHaveURL(/.*payment-success/);
  });

  test('should validate payment form', async ({ page }) => {
    await page.goto('/bills');
    await page.click('[data-testid="bill-item"]:first-child');
    await page.click('[data-testid="pay-bill-button"]');

    // Submit empty form
    await page.click('[data-testid="submit-payment-button"]');

    // Should show validation errors
    await expect(page.locator('text=Payment method is required')).toBeVisible();
    await expect(page.locator('text=Card number is required')).toBeVisible();
  });

  test('should make payment with Stellar wallet', async ({ page }) => {
    // Mock Stellar wallet
    await page.evaluate(() => {
      window.freighter = {
        isConnected: () => Promise.resolve(true),
        getUserInfo: () => Promise.resolve({
          publicKey: 'GDTESTACCOUNT123456789',
          network: 'TESTNET'
        }),
        signTransaction: (xdr: string) => Promise.resolve('signed-transaction-xdr')
      };
    });

    await page.goto('/bills');
    await page.click('[data-testid="bill-item"]:first-child');
    await page.click('[data-testid="pay-bill-button"]');

    // Select Stellar payment method
    await page.selectOption('[data-testid="payment-method"]', 'STELLAR');

    // Should show wallet connection UI
    await expect(page.locator('[data-testid="stellar-payment"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Submit Stellar payment
    await page.click('[data-testid="submit-stellar-payment"]');

    // Should show success
    await expect(page.locator('text=Payment successful')).toBeVisible();
  });

  test('should view payment history', async ({ page }) => {
    await page.click('[data-testid="payments-nav"]');
    await expect(page).toHaveURL(/.*payments/);

    // Should see payment history
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);

    // Should be able to filter payments
    await page.selectOption('[data-testid="payment-filter"]', 'SUCCESS');
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);

    // Should be able to search payments
    await page.fill('[data-testid="payment-search"]', 'test');
    await page.press('[data-testid="payment-search"]', 'Enter');
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/payment/process', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment failed' })
      });
    });

    await page.goto('/bills');
    await page.click('[data-testid="bill-item"]:first-child');
    await page.click('[data-testid="pay-bill-button"]');

    await page.selectOption('[data-testid="payment-method"]', 'CREDIT_CARD');
    await page.fill('[data-testid="card-number"]', '4000000000000002'); // Declined card
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Test User');

    await page.click('[data-testid="submit-payment-button"]');

    // Should show error message
    await expect(page.locator('text=Payment failed')).toBeVisible();
  });

  test('should validate payment amount', async ({ page }) => {
    await page.goto('/bills');
    await page.click('[data-testid="bill-item"]:first-child');
    await page.click('[data-testid="pay-bill-button"]');

    // Try to pay with invalid amount (if custom amount is allowed)
    if (await page.locator('[data-testid="custom-amount"]').isVisible()) {
      await page.fill('[data-testid="custom-amount"]', '0');
      await page.click('[data-testid="submit-payment-button"]');

      await expect(page.locator('text=Amount must be greater than 0')).toBeVisible();
    }
  });
});
