import { test, expect } from '@playwright/test';

test.describe('Dashboard and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user for analytics access
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    // Should see dashboard elements
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-bills"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-bills"]')).toBeVisible();

    // Should see charts
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible();

    // Should see recent activity
    await expect(page.locator('[data-testid="recent-payments"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-bills"]')).toBeVisible();
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    // Test navigation
    await page.click('[data-testid="analytics-nav"]');
    await expect(page).toHaveURL(/.*analytics/);

    await page.click('[data-testid="dashboard-nav"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.click('[data-testid="bills-nav"]');
    await expect(page).toHaveURL(/.*bills/);

    await page.click('[data-testid="payments-nav"]');
    await expect(page).toHaveURL(/.*payments/);
  });

  test('should generate and download reports', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    
    // Generate revenue report
    await page.click('[data-testid="generate-report-button"]');
    await page.fill('[data-testid="report-title"]', 'Test Revenue Report');
    await page.selectOption('[data-testid="report-type"]', 'REVENUE');
    await page.click('[data-testid="create-report-button"]');

    // Should see success message
    await expect(page.locator('text=Report generated successfully')).toBeVisible();

    // Download report
    await page.click('[data-testid="download-report-button"]');
    
    // Should trigger download (verify by checking download event)
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should filter and search data', async ({ page }) => {
    await page.click('[data-testid="payments-nav"]');

    // Test date range filter
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="apply-filter"]');

    // Should update results
    await expect(page.locator('[data-testid="payment-item"]')).toBeVisible();

    // Test search
    await page.fill('[data-testid="search-input"]', 'test');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Should filter results
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.lessThan(10);
  });

  test('should display responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Should show mobile menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Navigate via mobile menu
    await page.click('[data-testid="mobile-bills-nav"]');
    await expect(page).toHaveURL(/.*bills/);

    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-bill-list"]')).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    await page.goto('/dashboard');

    // Mock WebSocket for real-time updates
    await page.evaluate(() => {
      const mockWebSocket = new EventTarget();
      // Simulate real-time payment update
      setTimeout(() => {
        mockWebSocket.dispatchEvent(new CustomEvent('payment', {
          detail: {
            type: 'PAYMENT_RECEIVED',
            data: { amount: 100, status: 'SUCCESS' }
          }
        }));
      }, 1000);
      window.ws = mockWebSocket;
    });

    // Should show notification for new payment
    await expect(page.locator('[data-testid="notification"]')).toBeVisible({ timeout: 2000 });
  });

  test('should display analytics charts correctly', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');

    // Wait for charts to load
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible();

    // Test chart interactions
    await page.hover('[data-testid="revenue-chart"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();

    // Test chart time range selection
    await page.selectOption('[data-testid="chart-period"]', '7d');
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();

    // Test chart type toggle
    await page.click('[data-testid="chart-type-toggle"]');
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/analytics/dashboard', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/dashboard');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible();

    // Should provide retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
