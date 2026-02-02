/**
 * Landing Page Integration Tests
 * 
 * Tests the marketing site loads correctly and key elements are present
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('should load landing page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Kin/);
    
    // Check main heading exists
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
  
  test('should display hero section', async ({ page }) => {
    // Hero section should be visible
    const hero = page.locator('[data-testid="hero"], .hero, main');
    await expect(hero).toBeVisible();
    
    // Should have a main value proposition
    const valueProp = page.locator('h1, h2').first();
    await expect(valueProp).toContainText(/[Kk]in|[Aa][Ii]|[Aa]ssistant/);
  });
  
  test('should have working navigation', async ({ page }) => {
    // Navigation should be visible
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
    
    // Should have logo or brand
    const logo = page.locator('[data-testid="logo"], .logo, nav a').first();
    await expect(logo).toBeVisible();
  });
  
  test('should have CTA buttons', async ({ page }) => {
    // Look for primary CTA buttons
    const ctaButtons = page.locator('button, a').filter({ hasText: /[Gg]et [Ss]tarted|[Ss]ign [Uu]p|[Tt]ry [Ff]ree/ });
    
    // At least one CTA should be visible
    await expect(ctaButtons.first()).toBeVisible();
  });
  
  test('should have pricing section or link', async ({ page }) => {
    // Look for pricing link or section
    const pricing = page.locator('a, section').filter({ hasText: /[Pp]ricing|[Pp]lans/ });
    await expect(pricing.first()).toBeVisible();
  });
  
  test('should have features section', async ({ page }) => {
    // Look for features section
    const features = page.locator('[data-testid="features"], section').filter({ hasText: /[Ff]eature/ });
    await expect(features.first()).toBeVisible();
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still load
    await expect(page.locator('h1')).toBeVisible();
    
    // Navigation should adapt (hamburger menu or similar)
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
  });
  
  test('should have footer with links', async ({ page }) => {
    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Should have copyright or company info
    await expect(footer).toContainText(/©|2024|2025|Kin/);
  });
  
  test('CTA buttons should navigate to signup', async ({ page }) => {
    const ctaButton = page.locator('a').filter({ hasText: /[Gg]et [Ss]tarted|[Ss]ign [Uu]p/ }).first();
    
    if (await ctaButton.isVisible()) {
      await ctaButton.click();
      
      // Should navigate to signup or pricing page
      await expect(page).toHaveURL(/sign(up|in)|pricing|auth/);
    }
  });
});
