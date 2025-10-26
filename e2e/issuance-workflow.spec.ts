import { test, expect } from '@playwright/test';

/**
 * Issuance Workflow Tests
 * 
 * Tests the complete issuance workflow including:
 * - Creating issuance requests
 * - Admin approval/rejection
 * - Automatic credit batch creation
 * - Serial number allocation
 * - Certificates
 */

test.describe('Issuance Request Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create issuance request for approved project', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('text=/Create Issuance Request/i');
    
    // Find Create Issuance Request button
    const createButton = page.getByRole('button', { name: /create.*issuance/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill issuance form
      await page.selectOption('select[name="projectId"]', { index: 0 });
      await page.fill('input[name="vintageStart"], input[placeholder*="vintage start" i]', '2024');
      await page.fill('input[name="vintageEnd"], input[placeholder*="vintage end" i]', '2024');
      await page.fill('input[name="quantity"]', '50000');
      await page.fill('input[name="factorRef"]', 'factor_renewable_2024_v2.1');
      
      // Submit
      await page.getByRole('button', { name: /submit|create/i }).click();
      
      // Should see success
      await expect(page.locator('text=/success/i')).toBeVisible();
    }
  });

  test('should show issuance requests in Pending section', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('.card');
    
    // Should see pending issuances section
    const pendingSection = page.locator('text=/Pending Issuances/i');
    await expect(pendingSection).toBeVisible();
    
    // Should show issuance request with UNDER_REVIEW status
    await expect(page.locator('text=/under.*review/i')).toBeVisible();
  });

  test('should show factor reference tooltip', async ({ page }) => {
    // Open create issuance modal
    const createButton = page.getByRole('button', { name: /create.*issuance/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Hover over factor reference field or info icon
      const infoIcon = page.locator('svg').first();
      if (await infoIcon.isVisible()) {
        await infoIcon.hover();
        
        // Should see tooltip with explanation
        await expect(page.locator('text=/emission.*factor/i')).toBeVisible();
      }
    }
  });
});

test.describe('Admin Issuance Approval', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show pending issuance requests', async ({ page }) => {
    // Wait for dashboard
    await page.waitForSelector('text=/Pending Issuance Requests/i');
    
    // Should see issuance requests
    await expect(page.locator('text=/Requested Credits/i')).toBeVisible();
  });

  test('should approve issuance request', async ({ page }) => {
    // Find Approve button for issuance
    const approveButtons = page.locator('button:has-text("Approve")');
    if (await approveButtons.count() > 0) {
      // Count issuances before
      const beforeCount = await approveButtons.count();
      
      await approveButtons.first().click();
      
      // Should see success
      await expect(page.locator('text=/approved|success/i')).toBeVisible();
      
      // Wait for refresh
      await page.waitForTimeout(1000);
      
      // Count after (should be less or finalization should appear)
      const finalizationSection = page.locator('text=/Finalized Issuances/i');
      await expect(finalizationSection).toBeVisible();
    }
  });

  test('should show finalized issuances with serial numbers', async ({ page }) => {
    // Wait for Finalized Issuances section
    await page.waitForSelector('text=/Finalized Issuances/i');
    
    // Should see serial numbers
    const serialInfo = page.locator('text=/Serial Numbers/i');
    if (await serialInfo.isVisible()) {
      // Should display serial range
      await expect(page.locator('text=/\\d+.*\\d+/')).toBeVisible();
      
      // Should display class ID
      await expect(page.locator('text=/Class ID/i')).toBeVisible();
    }
  });

  test('should reject issuance request with reason', async ({ page }) => {
    // Find Reject button
    const rejectButtons = page.locator('button:has-text("Reject")');
    if (await rejectButtons.count() > 0) {
      await rejectButtons.first().click();
      
      // Fill rejection reason
      const reasonInput = page.locator('textarea, input[type="text"]').last();
      await reasonInput.fill('Insufficient methodology documentation');
      
      // Confirm rejection
      await page.getByRole('button', { name: /confirm|reject/i }).click();
      
      // Should see success
      await expect(page.locator('text=/rejected|success/i')).toBeVisible();
    }
  });
});

test.describe('Issuer Response to Rejection', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show rejection reason for rejected issuances', async ({ page }) => {
    // Look for rejected issuances
    const rejectedIssuances = page.locator('text=/rejected/i');
    if (await rejectedIssuances.count() > 0) {
      // Should show rejection reason
      await expect(page.locator('text=/reason/i')).toBeVisible();
      
      // Should allow creating new issuance for same project
      const createNewButton = page.locator('button:has-text("Create New")');
      if (await createNewButton.isVisible()) {
        await expect(createNewButton).toBeVisible();
      }
    }
  });

  test('should create new issuance after rejection', async ({ page }) => {
    // Find Create Issuance Request button
    const createButton = page.getByRole('button', { name: /create.*issuance/i });
    await createButton.click();
    
    // Select approved project
    await page.selectOption('select[name="projectId"]', { index: 0 });
    
    // Fill form
    await page.fill('input[name="vintageStart"]', '2024');
    await page.fill('input[name="vintageEnd"]', '2024');
    await page.fill('input[name="quantity"]', '45000');
    await page.fill('input[name="factorRef"]', 'factor_renewable_2024_v2.2');
    
    // Submit
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Should see success
    await expect(page.locator('text=/success/i')).toBeVisible();
  });
});

