import { test, expect } from '@playwright/test';

test.describe('Party Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create new party', async ({ page }) => {
    // Navigate to parties page
    await page.click('text=Parties');
    await expect(page).toHaveURL('/parties');
    
    // Click Add Party button
    await page.click('text=Add Party');
    
    // Fill party form
    await page.fill('input[name="name"]', 'Test Company Ltd');
    await page.fill('input[name="contactPerson"]', 'John Doe');
    await page.fill('input[name="phone"]', '+91 9876543210');
    await page.fill('input[name="email"]', 'test@company.com');
    await page.fill('input[name="address"]', 'Test Address, Mumbai');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=Party created successfully')).toBeVisible();
  });

  test('should view party list', async ({ page }) => {
    await page.click('text=Parties');
    await expect(page).toHaveURL('/parties');
    
    // Check if parties table is visible
    await expect(page.locator('h1')).toContainText('Party Management');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should search parties', async ({ page }) => {
    await page.click('text=Parties');
    await expect(page).toHaveURL('/parties');
    
    // Use search functionality
    await page.fill('input[placeholder*="Search"]', 'Test');
    
    // Verify search results
    await page.waitForTimeout(1000);
  });
});