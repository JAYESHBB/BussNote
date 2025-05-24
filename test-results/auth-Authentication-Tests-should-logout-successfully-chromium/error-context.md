# Test info

- Name: Authentication Tests >> should logout successfully
- Location: /home/runner/workspace/tests/auth.spec.ts:39:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Authentication Tests', () => {
   4 |   test('should load login page', async ({ page }) => {
   5 |     await page.goto('/auth');
   6 |     await expect(page).toHaveTitle(/BussNote/);
   7 |     await expect(page.locator('h2')).toContainText('Welcome Back');
   8 |   });
   9 |
  10 |   test('should login with valid credentials', async ({ page }) => {
  11 |     await page.goto('/auth');
  12 |     
  13 |     // Fill login form
  14 |     await page.fill('input[name="username"]', 'JAYESHBB');
  15 |     await page.fill('input[name="password"]', 'admin123');
  16 |     
  17 |     // Click login button
  18 |     await page.click('button[type="submit"]');
  19 |     
  20 |     // Should redirect to dashboard
  21 |     await expect(page).toHaveURL('/');
  22 |     await expect(page.locator('h1')).toContainText('Dashboard');
  23 |   });
  24 |
  25 |   test('should show error for invalid credentials', async ({ page }) => {
  26 |     await page.goto('/auth');
  27 |     
  28 |     // Fill with wrong credentials
  29 |     await page.fill('input[name="username"]', 'wronguser');
  30 |     await page.fill('input[name="password"]', 'wrongpass');
  31 |     
  32 |     // Click login button
  33 |     await page.click('button[type="submit"]');
  34 |     
  35 |     // Should show error message
  36 |     await expect(page.locator('[role="alert"]')).toBeVisible();
  37 |   });
  38 |
> 39 |   test('should logout successfully', async ({ page }) => {
     |   ^ Error: browserType.launch: Executable doesn't exist at /home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
  40 |     // First login
  41 |     await page.goto('/auth');
  42 |     await page.fill('input[name="username"]', 'JAYESHBB');
  43 |     await page.fill('input[name="password"]', 'admin123');
  44 |     await page.click('button[type="submit"]');
  45 |     
  46 |     // Wait for dashboard to load
  47 |     await expect(page).toHaveURL('/');
  48 |     
  49 |     // Click on user menu
  50 |     await page.click('button:has-text("JB")');
  51 |     
  52 |     // Click logout
  53 |     await page.click('text=Logout');
  54 |     
  55 |     // Should redirect to auth page
  56 |     await expect(page).toHaveURL('/auth');
  57 |   });
  58 | });
```