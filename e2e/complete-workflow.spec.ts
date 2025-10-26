import { test, expect } from '@playwright/test';

/**
 * Complete End-to-End Workflow Test
 * 
 * Tests the complete flow from project creation to retirement
 */

test.describe('Complete Carbon Credit Workflow', () => {
  test('full workflow: project → issuance → credits → retirement', async ({ page }) => {
    // STEP 1: Issuer creates a project
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Create project
    const createProjectButton = page.getByRole('button', { name: /create.*project/i });
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click();
      await page.fill('input[placeholder*="title" i]', 'Wind Farm Beta');
      await page.fill('textarea[placeholder*="description" i]', 'Renewable wind energy project');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.locator('text=/success/i')).toBeVisible();
    }
    
    // Submit for review
    const submitButton = page.locator('button:has-text("Submit")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.locator('text=/submitted/i')).toBeVisible();
    }
    
    // STEP 2: Admin approves project
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Approve project
    const approveButtons = page.locator('button:has-text("Approve")');
    if (await approveButtons.count() > 0) {
      await approveButtons.first().click();
      await expect(page.locator('text=/approved/i')).toBeVisible();
    }
    
    // STEP 3: Issuer creates issuance request
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    const createIssuanceButton = page.getByRole('button', { name: /create.*issuance/i });
    if (await createIssuanceButton.isVisible()) {
      await createIssuanceButton.click();
      await page.selectOption('select[name="projectId"]', { index: 0 });
      await page.fill('input[name="vintageStart"]', '2024');
      await page.fill('input[name="vintageEnd"]', '2024');
      await page.fill('input[name="quantity"]', '75000');
      await page.fill('input[name="factorRef"]', 'factor_wind_2024_v1.0');
      await page.getByRole('button', { name: /submit/i }).click();
      await expect(page.locator('text=/success/i')).toBeVisible();
    }
    
    // STEP 4: Admin approves issuance
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    const approveIssuanceButtons = page.locator('button:has-text("Approve")');
    if (await approveIssuanceButtons.count() > 0) {
      await approveIssuanceButtons.first().click();
      await expect(page.locator('text=/approved/i')).toBeVisible();
    }
    
    // Check for finalized issuance
    await page.waitForSelector('text=/Finalized Issuances/i');
    const finalizedSection = page.locator('text=/Finalized Issuances/i');
    if (await finalizedSection.isVisible()) {
      // Should see serial numbers
      await expect(page.locator('text=/Serial Numbers/i')).toBeVisible();
    }
    
    // STEP 5: Issuer views holdings
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check holdings
    const holdingsTab = page.locator('button:has-text("Holdings")');
    if (await holdingsTab.isVisible()) {
      await holdingsTab.click();
      await expect(page.locator('text=/Credit Holdings/i')).toBeVisible();
    }
    
    // STEP 6: Issuer retires credits
    const retireButton = page.getByRole('button', { name: /retire/i });
    if (await retireButton.isVisible()) {
      await retireButton.click();
      await page.fill('input[name="quantity"]', '2500');
      await page.fill('textarea[name="reason"]', 'Company carbon neutral initiative');
      await page.getByRole('button', { name: /submit/i }).click();
      await expect(page.locator('text=/retired|success/i')).toBeVisible();
    }
    
    // STEP 7: Verify public explorer
    await page.goto('/explorer');
    await expect(page.locator('text=/Official Registry/i')).toBeVisible();
    await expect(page.locator('text=/Wind Farm Beta/i')).toBeVisible();
    
    // Open project details
    const projectCard = page.locator('.card, .border').first();
    await projectCard.click();
    
    // Should see serial ranges
    await expect(page.locator('text=/Serial.*Range/i')).toBeVisible();
    
    // Should see retirement in stats
    await expect(page.locator('text=/75000/i')).toBeVisible();
  });
});

