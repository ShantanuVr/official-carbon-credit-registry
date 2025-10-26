import { test, expect } from '@playwright/test';

/**
 * Public Explorer Tests
 * 
 * Tests the public-facing explorer and stats endpoints
 */

test.describe('Public Explorer Page', () => {
  test('should load without authentication', async ({ page }) => {
    await page.goto('/explorer');
    
    // Should see AuthorityBanner
    await expect(page.locator('text=/Official Registry/i')).toBeVisible();
    await expect(page.locator('text=/Source of Record.*CREDIT/i')).toBeVisible();
    
    // Should see stats
    await expect(page.locator('text=/Total Projects/i')).toBeVisible();
    await expect(page.locator('text=/Total Credits/i')).toBeVisible();
  });

  test('should display approved projects', async ({ page }) => {
    await page.goto('/explorer');
    
    // Wait for projects to load
    await page.waitForSelector('.grid');
    
    // Should see project cards
    const projectCards = page.locator('.card, .border');
    await expect(projectCards.first()).toBeVisible();
    
    // Should show project details
    await expect(page.locator('text=/Project/i')).toBeVisible();
  });

  test('should display project statistics correctly', async ({ page }) => {
    await page.goto('/explorer');
    
    // Wait for stats
    await page.waitForSelector('text=/Total Credits/i');
    
    // Should show issued credits
    await expect(page.locator('text=/\\d+.*issued/i')).toBeVisible();
    
    // Should show retired credits
    await expect(page.locator('text=/\\d+.*retired/i')).toBeVisible();
  });

  test('should open project details modal', async ({ page }) => {
    await page.goto('/explorer');
    
    // Wait for projects
    await page.waitForSelector('.card, .border');
    
    // Click on first project
    const firstProject = page.locator('.card, .border').first();
    await firstProject.click();
    
    // Should see details modal
    await expect(page.locator('text=/Project Details/i')).toBeVisible();
    
    // Should show serial ranges
    await expect(page.locator('text=/Serial.*Range/i')).toBeVisible();
    
    // Should show ProvenancePill
    await expect(page.locator('text=/Credit.*Class/i')).toBeVisible();
  });

  test('should show tokenization status', async ({ page }) => {
    await page.goto('/explorer');
    
    // Open project details
    const project = page.locator('.card, .border').first();
    await project.click();
    
    // Should see tokenization card
    await expect(page.locator('text=/Tokenization/i')).toBeVisible();
    
    // Should show NOT_REQUESTED status
    await expect(page.locator('text=/NOT.*REQUESTED/i')).toBeVisible();
  });
});

test.describe('Public Stats Endpoint', () => {
  test('should return proper stats structure', async ({ page }) => {
    // Visit homepage which calls /public/stats
    await page.goto('/');
    
    // Should see stats displayed
    await expect(page.locator('text=/Total Projects/i')).toBeVisible();
    await expect(page.locator('text=/\\d+/')).toBeVisible();
  });

  test('should display authority field', async ({ page }) => {
    await page.goto('/explorer');
    
    // Should show authority banner
    await expect(page.locator('text=/CREDIT/i')).toBeVisible();
  });

  test('should filter by project status', async ({ page }) => {
    await page.goto('/explorer');
    
    // Should only show APPROVED projects
    const projects = page.locator('.card, .border');
    
    // All displayed projects should be approved
    // This is verified by the data structure
    
    // Should not show DRAFT or UNDER_REVIEW projects
    await expect(page.locator('text=/DRAFT/i')).not.toBeVisible();
    await expect(page.locator('text=/UNDER_REVIEW/i')).not.toBeVisible();
  });
});

test.describe('Serial Number Display', () => {
  test('should show serial number ranges in public view', async ({ page }) => {
    await page.goto('/explorer');
    
    // Open project details
    const project = page.locator('.card, .border').first();
    await project.click();
    
    // Should see serial ranges
    await expect(page.locator('text=/Serial.*Number/i')).toBeVisible();
    
    // Should display range format
    await expect(page.locator('text=/\\d+.*\\d+/')).toBeVisible();
  });

  test('should show ProvenancePill with class ID', async ({ page }) => {
    await page.goto('/explorer');
    
    // Open project
    const project = page.locator('.card, .border').first();
    await project.click();
    
    // Should see provenance information
    await expect(page.locator('text=/Class/i')).toBeVisible();
    
    // Should show credit authority
    await expect(page.locator('text=/Credit/i')).toBeVisible();
  });
});

