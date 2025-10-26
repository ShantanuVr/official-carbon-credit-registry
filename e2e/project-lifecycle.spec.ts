import { test, expect } from '@playwright/test';

/**
 * Project Lifecycle Tests
 * 
 * Tests the complete project workflow: DRAFT → UNDER_REVIEW → NEEDS_CHANGES → APPROVED
 */

test.describe('Project Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create a new project in DRAFT status', async ({ page }) => {
    // Navigate to create project
    const createButton = page.getByRole('button', { name: /create.*project/i });
    if (await createButton.isVisible()) {
      await createButton.click();
    }
    
    // Fill project form
    await page.fill('input[name="title"], input[placeholder*="title" i]', 'Solar Farm Project Alpha');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'A solar farm project in rural India');
    
    // Submit project
    await page.getByRole('button', { name: /save|submit|create/i }).click();
    
    // Should see success notification
    await expect(page.locator('text=/project.*created|success/i')).toBeVisible();
    
    // Project should appear in draft list
    await expect(page.locator('text=Solar Farm Project Alpha')).toBeVisible();
  });

  test('should show Submit button for DRAFT projects', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.border.rounded-lg');
    
    // Look for DRAFT projects
    const draftProjects = page.locator('text=/draft/i');
    if (await draftProjects.count() > 0) {
      // Find the first draft project card
      const projectCard = draftProjects.first().locator('..');
      
      // Should have a Submit button
      await expect(projectCard.getByRole('button', { name: /submit/i })).toBeVisible();
    }
  });

  test('should submit project for review', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.border.rounded-lg');
    
    // Find a DRAFT project and click Submit
    const submitButton = page.locator('button:has-text("Submit")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should see success notification
      await expect(page.locator('text=/submitted|success/i')).toBeVisible();
      
      // Status should change to UNDER_REVIEW
      await expect(page.locator('text=/under.*review/i')).toBeVisible();
    }
  });
});

test.describe('Admin Project Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show projects under review in admin dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('text=/Projects Under Review/i');
    
    // Should see stats card for pending reviews
    const pendingReviews = page.locator('text=/Pending Reviews/i');
    await expect(pendingReviews).toBeVisible();
  });

  test('should approve a project', async ({ page }) => {
    // Wait for projects under review section
    await page.waitForSelector('text=/Projects Under Review/i');
    
    // Find an Approve button
    const approveButtons = page.locator('button:has-text("Approve")');
    if (await approveButtons.count() > 0) {
      await approveButtons.first().click();
      
      // Should see success notification
      await expect(page.locator('text=/approved|success/i')).toBeVisible();
      
      // Project status should update
      await expect(page.locator('text=/approved/i')).toBeVisible();
    }
  });

  test('should request changes on a project', async ({ page }) => {
    // Wait for projects under review section
    await page.waitForSelector('text=/Projects Under Review/i');
    
    // Find a Request Changes button
    const requestChangesButton = page.locator('button:has-text("Request Changes")').first();
    if (await requestChangesButton.isVisible()) {
      await requestChangesButton.click();
      
      // Fill in feedback
      const feedbackInput = page.locator('textarea, input[type="text"]').last();
      await feedbackInput.fill('Please provide more detailed methodology documentation');
      
      // Confirm
      await page.getByRole('button', { name: /confirm|submit/i }).click();
      
      // Should see success notification
      await expect(page.locator('text=/success/i')).toBeVisible();
    }
  });
});

test.describe('Issuer Response to Feedback', () => {
  test.beforeEach(async ({ page }) => {
    // Login as issuer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'issuer@carbonregistry.test');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show feedback for projects needing changes', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.border.rounded-lg');
    
    // Look for projects with NEEDS_CHANGES status
    const needsChangesProjects = page.locator('text=/needs.*changes/i');
    if (await needsChangesProjects.count() > 0) {
      // Should see feedback alert
      await expect(page.locator('text=/feedback|comment/i')).toBeVisible();
      
      // Should have a Resubmit button
      await expect(page.locator('button:has-text("Resubmit")')).toBeVisible();
    }
  });

  test('should edit and resubmit project after feedback', async ({ page }) => {
    // Find an Edit button for a project needing changes
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Make changes
      await page.fill('textarea', 'Updated project with detailed methodology documentation');
      
      // Save
      await page.getByRole('button', { name: /save/i }).click();
      
      // Should see success
      await expect(page.locator('text=/saved|success/i')).toBeVisible();
      
      // Find Resubmit button
      const resubmitButton = page.locator('button:has-text("Resubmit")').first();
      await resubmitButton.click();
      
      // Should see success
      await expect(page.locator('text=/resubmitted|success/i')).toBeVisible();
    }
  });
});

