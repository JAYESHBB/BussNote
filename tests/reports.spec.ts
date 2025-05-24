import { test, expect } from '@playwright/test';

test.describe('Reports & Analytics Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should access reports page', async ({ page }) => {
    // Navigate to reports
    await page.click('text=Reports');
    await expect(page).toHaveURL('/reports');
    
    // Check if reports interface is visible
    await expect(page.locator('h1')).toContainText('Reports & Analytics');
    await expect(page.locator('text=Sales Analysis')).toBeVisible();
  });

  test('should display sales and brokerage charts', async ({ page }) => {
    await page.click('text=Reports');
    
    // Wait for charts to load
    await page.waitForTimeout(3000);
    
    // Check if charts are rendered
    const charts = page.locator('.recharts-wrapper');
    await expect(charts.first()).toBeVisible();
  });

  test('should show currency-wise breakdown', async ({ page }) => {
    await page.click('text=Reports');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for currency breakdown tables
    await expect(page.locator('text=Currency-wise Breakdown')).toBeVisible();
  });
});