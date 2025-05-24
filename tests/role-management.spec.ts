import { test, expect } from '@playwright/test';

test.describe('Role Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'JAYESHBB');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should access role management page', async ({ page }) => {
    // Navigate to role management
    await page.goto('/settings/roles');
    
    // Check if role management interface is visible
    await expect(page.locator('h1')).toContainText('Role & Permission Management');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Create Role')).toBeVisible();
  });

  test('should create new custom role', async ({ page }) => {
    await page.goto('/settings/roles');
    
    // Click Create Role button
    await page.click('text=Create Role');
    
    // Fill role form
    await page.fill('input[name="name"]', 'Test Role');
    await page.fill('textarea[name="description"]', 'Test role for automated testing');
    
    // Select some permissions
    await page.check('input[id="dashboard_view"]');
    await page.check('input[id="users_view"]');
    await page.check('input[id="invoices_view"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=Role created successfully')).toBeVisible();
  });

  test('should edit custom role', async ({ page }) => {
    await page.goto('/settings/roles');
    
    // Look for custom roles (not system roles)
    const customRoleRow = page.locator('table tbody tr').filter({ hasText: 'Custom' }).first();
    
    if (await customRoleRow.isVisible()) {
      // Click edit button for custom role
      await customRoleRow.locator('button').first().click();
      
      // Modify role description
      await page.fill('textarea[name="description"]', 'Updated test role description');
      
      // Submit changes
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=Role updated successfully')).toBeVisible();
    }
  });

  test('should display system roles as read-only', async ({ page }) => {
    await page.goto('/settings/roles');
    
    // Check that system roles have disabled edit buttons
    const systemRoleRow = page.locator('table tbody tr').filter({ hasText: 'System' }).first();
    
    if (await systemRoleRow.isVisible()) {
      const editButton = systemRoleRow.locator('button').first();
      await expect(editButton).toBeDisabled();
    }
  });
});