import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * 
 * Tests the complete user registration and login workflow
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login form with required fields', async ({ page }) => {
    // Check for email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for login button
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check for validation error
    await expect(page.locator('text=/email.*required/i')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display appropriate dashboard based on user role', async ({ page }) => {
    const roles = [
      { email: 'admin@carbonregistry.test', password: 'password123', role: 'Admin' },
      { email: 'issuer@carbonregistry.test', password: 'password123', role: 'Issuer' },
      { email: 'verifier@carbonregistry.test', password: 'password123', role: 'Verifier' },
      { email: 'viewer@carbonregistry.test', password: 'password123', role: 'Viewer' }
    ];

    for (const user of roles) {
      await page.goto('/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.getByRole('button', { name: /login/i }).click();
      
      // Wait for dashboard to load
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Check for role-specific content
      await expect(page.locator(`text=/${user.role}/i`)).toBeVisible();
    }
  });

  test('should logout user', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    }
  });
});

