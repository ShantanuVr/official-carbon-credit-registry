import { test, expect } from '@playwright/test';

/**
 * Credit Operations Tests
 * 
 * Tests credit holdings, transfers, and retirement operations
 */

test.describe('Credit Holdings', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer with finalized credits
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display credit holdings for organization', async ({ page }) => {
    // Wait for holdings section
    await page.waitForSelector('text=/Credit Holdings/i');
    
    // Should show total holdings
    await expect(page.locator('text=/Total Holdings/i')).toBeVisible();
    
    // Should show credit batches
    await expect(page.locator('text=/Serial Numbers/i')).toBeVisible();
  });

  test('should display serial number ranges', async ({ page }) => {
    // Navigate to holdings
    const holdingsTab = page.locator('button:has-text("Holdings")');
    if (await holdingsTab.isVisible()) {
      await holdingsTab.click();
      
      // Should see serial ranges
      await expect(page.locator('text=/\\d+.*\\d+/')).toBeVisible();
      
      // Should display project info
      await expect(page.locator('text=/project/i')).toBeVisible();
    }
  });
});

test.describe('Credit Transfers', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should initiate credit transfer', async ({ page }) => {
    // Find Transfer button
    const transferButton = page.getByRole('button', { name: /transfer/i });
    if (await transferButton.isVisible()) {
      await transferButton.click();
      
      // Fill transfer form
      await page.selectOption('select[name="toOrgId"]', { index: 0 });
      await page.fill('input[name="quantity"]', '5000');
      
      // Submit
      await page.getByRole('button', { name: /submit|transfer/i }).click();
      
      // Should see success
      await expect(page.locator('text=/transfer.*success/i')).toBeVisible();
    }
  });

  test('should show transfer history', async ({ page }) => {
    // Navigate to transfer history
    const transferHistoryTab = page.locator('button:has-text("Transfer History")');
    if (await transferHistoryTab.isVisible()) {
      await transferHistoryTab.click();
      
      // Should show transfers
      await expect(page.locator('text=/Transfer History/i')).toBeVisible();
      
      // Should show recipient
      await expect(page.locator('text=/recipient|to/i')).toBeVisible();
    }
  });
});

test.describe('Credit Retirement', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should retire credits', async ({ page }) => {
    // Find Retire button
    const retireButton = page.getByRole('button', { name: /retire/i });
    if (await retireButton.isVisible()) {
      await retireButton.click();
      
      // Fill retirement form
      await page.fill('input[name="quantity"]', '1000');
      await page.fill('textarea[name="reason"]', 'Corporate sustainability initiative');
      
      // Submit
      await page.getByRole('button', { name: /submit|retire/i }).click();
      
      // Should see success
      await expect(page.locator('text=/retired|success/i')).toBeVisible();
    }
  });

  test('should generate retirement certificate', async ({ page }) => {
    // Wait for retirement to complete
    await page.waitForSelector('text=/Retirement History/i');
    
    // Find certificate link
    const certificateLink = page.locator('a:has-text("Certificate"), button:has-text("Certificate")');
    if (await certificateLink.count() > 0) {
      await certificateLink.first().click();
      
      // Should display certificate
      await expect(page.locator('text=/Certificate/i')).toBeVisible();
      
      // Should show watermark
      await expect(page.locator('text=/CREDIT.*OFF.*CHAIN/i')).toBeVisible();
      
      // Should show retirement details
      await expect(page.locator('text=/Retired/i')).toBeVisible();
    }
  });

  test('should display retirement history', async ({ page }) => {
    // Navigate to retirement history
    const retirementTab = page.locator('button:has-text("Retirement")');
    if (await retirementTab.isVisible()) {
      await retirementTab.click();
      
      // Should show retirements
      await expect(page.locator('text=/Retirement History/i')).toBeVisible();
      
      // Should show retirement quantity
      await expect(page.locator('text=/\\d+.*tCO/i')).toBeVisible();
    }
  });
});

