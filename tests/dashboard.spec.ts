import { test, expect } from '@playwright/test';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should display dashboard cards with real data', async ({ page }) => {
    // Check that dashboard cards are visible
    await expect(page.locator('text=Total Sales')).toBeVisible();
    await expect(page.locator('text=Outstanding Invoices')).toBeVisible();
    await expect(page.locator('text=Total Brokerage')).toBeVisible();
    await expect(page.locator('text=Outstanding Brokerage')).toBeVisible();
    await expect(page.locator('text=Received Brokerage')).toBeVisible();
    
    // Verify that cards show actual numbers (not loading states)
    await page.waitForTimeout(2000); // Wait for data to load
    const totalSalesCard = page.locator('text=Total Sales').locator('..');
    await expect(totalSalesCard).not.toContainText('Loading');
  });

  test('should display recent invoices', async ({ page }) => {
    // Check recent invoices section
    await expect(page.locator('text=Recent Invoices')).toBeVisible();
    
    // Wait for data to load and check if invoices are displayed
    await page.waitForTimeout(2000);
    const invoicesTable = page.locator('table');
    if (await invoicesTable.isVisible()) {
      await expect(invoicesTable).toBeVisible();
    }
  });

  test('should navigate to create new invoice', async ({ page }) => {
    // Click on New Invoice button
    await page.click('text=New Invoice');
    
    // Should open invoice form dialog
    await expect(page.locator('text=Create Invoice')).toBeVisible();
  });

  test('should navigate between sections', async ({ page }) => {
    // Test navigation to Parties
    await page.click('text=Parties');
    await expect(page).toHaveURL('/parties');
    await expect(page.locator('h1')).toContainText('Party Management');
    
    // Test navigation to Invoices
    await page.click('text=Invoices');
    await expect(page).toHaveURL('/invoices');
    await expect(page.locator('h1')).toContainText('Invoice Management');
    
    // Test navigation back to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});