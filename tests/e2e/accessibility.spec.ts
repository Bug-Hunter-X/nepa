import { test, expect } from '@playwright/test';

test.describe('Accessibility and Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Login for authenticated tests
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should meet accessibility standards', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count();
    const h2 = await page.locator('h2').count();
    
    expect(h1).toBeGreaterThan(0);
    expect(h2).toBeGreaterThan(0);

    // Check for alt text on images
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);

    // Check for proper form labels
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    expect(inputsWithoutLabels).toBe(0);

    // Check for sufficient color contrast (basic check)
    const textElements = await page.locator('[role="button"], [data-testid*="button"]').all();
    for (const element of textElements.slice(0, 5)) { // Check first 5 elements
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Basic contrast check (not comprehensive)
      expect(styles.color).not.toBe(styles.backgroundColor);
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/bills');

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focused = await page.locator(':focus');
    expect(await focused.count()).toBeGreaterThan(0);

    // Navigate through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focused = await page.locator(':focus');
      expect(await focused.count()).toBeGreaterThan(0);
    }

    // Test Enter key on buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should trigger button action
    const currentUrl = page.url();
    expect(currentUrl).not.toBe('/bills');
  });

  test('should have fast page load times', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/payments');

    // Wait for initial load
    await page.waitForSelector('[data-testid="payment-item"]');

    // Test pagination
    await page.click('[data-testid="next-page"]');
    await page.waitForSelector('[data-testid="payment-item"]');

    // Test infinite scroll if present
    if (await page.locator('[data-testid="load-more"]').isVisible()) {
      await page.click('[data-testid="load-more"]');
      await page.waitForSelector('[data-testid="payment-item"]');
    }

    // Should not freeze or become unresponsive
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(isResponsive).toBe(true);
  });

  test('should work properly on slow connections', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/dashboard');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should still load eventually
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    expect(loadTime).toBeGreaterThan(1000); // Should be affected by throttling
  });

  test('should handle offline mode gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate to another page
    await page.click('[data-testid="bills-nav"]');
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should recover and load content
    await page.reload();
    await expect(page.locator('[data-testid="bills-content"]')).toBeVisible();
  });

  test('should be responsive across different screen sizes', async ({ viewports }) => {
    const sizes = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1024, height: 768 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto('/dashboard');
      
      // Should adapt layout
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Check if mobile menu appears on small screens
      if (size.width <= 768) {
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      }
    }
  });

  test('should handle memory leaks', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform multiple actions
    for (let i = 0; i < 10; i++) {
      await page.goto('/dashboard');
      await page.click('[data-testid="bills-nav"]');
      await page.click('[data-testid="payments-nav"]');
      await page.click('[data-testid="dashboard-nav"]');
    }

    // Force garbage collection
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory usage should not increase dramatically
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });
});
