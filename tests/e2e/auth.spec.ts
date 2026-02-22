import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register a new user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Register');
    await expect(page).toHaveURL(/.*register/);

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="name-input"]', 'Test User');

    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Should redirect to verification page or login
    await expect(page.locator('text=Registration successful')).toBeVisible();
  });

  test('should show validation errors for invalid registration data', async ({ page }) => {
    await page.click('text=Register');
    
    // Submit empty form
    await page.click('[data-testid="register-button"]');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.click('text=Login');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should login with Stellar wallet', async ({ page }) => {
    await page.click('text=Login');
    
    // Click wallet login option
    await page.click('[data-testid="wallet-login-button"]');

    // Mock wallet connection (in real test, this would interact with Freighter)
    await page.evaluate(() => {
      window.freighter = {
        isConnected: () => Promise.resolve(true),
        getUserInfo: () => Promise.resolve({
          publicKey: 'GDTESTACCOUNT123456789',
          network: 'TESTNET'
        })
      };
    });

    await page.click('[data-testid="connect-wallet-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Wallet connected')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL(/.*dashboard/);

    // Then logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to home/login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should enable two-factor authentication', async ({ page }) => {
    // Login first
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to security settings
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="security-settings"]');

    // Enable 2FA
    await page.click('[data-testid="enable-2fa-button"]');
    await page.selectOption('[data-testid="2fa-method"]', 'AUTHENTICATOR_APP');
    await page.click('[data-testid="setup-2fa-button"]');

    // Should show QR code and backup codes
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();
  });
});
