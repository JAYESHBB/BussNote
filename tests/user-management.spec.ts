import { test, expect } from '@playwright/test';

test.describe('User Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should access user management page', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await expect(page).toHaveURL('/settings');
    
    // Check if user management is visible
    await expect(page.locator('h1')).toContainText('User Management');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should create new user', async ({ page }) => {
    await page.click('text=Settings');
    
    // Click Add User button
    await page.click('text=Add User');
    
    // Fill user form
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="username"]', 'testuser001');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="mobile"]', '9876543210');
    await page.fill('input[name="address"]', 'Test Address');
    await page.selectOption('select[name="role"]', 'user');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });

  test('should toggle user status', async ({ page }) => {
    await page.click('text=Settings');
    
    // Find first user row and toggle status
    const firstUserRow = page.locator('table tbody tr').first();
    const statusToggle = firstUserRow.locator('button[role="switch"]');
    
    if (await statusToggle.isVisible()) {
      await statusToggle.click();
      await expect(page.locator('text=User status updated')).toBeVisible();
    }
  });
});