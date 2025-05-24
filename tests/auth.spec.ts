import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveTitle(/BussNote/);
    await expect(page.locator('h2')).toContainText('Welcome Back');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill login form
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill with wrong credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/');
    
    // Click on user menu
    await page.click('button:has-text("JB")');
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to auth page
    await expect(page).toHaveURL('/auth');
  });
});