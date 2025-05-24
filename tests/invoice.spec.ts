import { test, expect } from '@playwright/test';

test.describe('Invoice Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create new invoice', async ({ page }) => {
    // Navigate to invoices page
    await page.click('text=New Invoice');
    
    // Fill invoice form
    await page.waitForSelector('text=Create Invoice');
    
    // Fill basic invoice details
    await page.selectOption('select[name="partyId"]', { index: 1 });
    await page.selectOption('select[name="buyerId"]', { index: 1 });
    await page.fill('input[name="invoiceNo"]', 'TEST-INV-001');
    
    // Add invoice item
    await page.fill('input[placeholder="Item description"]', 'Test Product');
    await page.fill('input[placeholder="0"]', '10'); // quantity
    await page.fill('input[placeholder="0.00"]', '100'); // rate
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=Invoice created successfully')).toBeVisible();
  });

  test('should view invoice list', async ({ page }) => {
    // Navigate to invoices
    await page.click('text=Invoices');
    await expect(page).toHaveURL('/invoices');
    
    // Check if invoices table is visible
    await expect(page.locator('h1')).toContainText('Invoice Management');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter invoices', async ({ page }) => {
    await page.click('text=Invoices');
    await expect(page).toHaveURL('/invoices');
    
    // Test status filter
    await page.click('text=All Status');
    await page.click('text=Pending');
    
    // Verify filter is applied
    await expect(page.locator('text=Pending')).toBeVisible();
  });
});