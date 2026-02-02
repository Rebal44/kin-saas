/**
 * Authentication Flow Integration Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });
  
  test('should display signup form', async ({ page }) => {
    // Form should be visible
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Should have email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Should have password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });
  
  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.locator('text=/required|invalid|error/i').first()).toBeVisible();
  });
  
  test('should validate email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Enter invalid email
    await emailInput.fill('invalid-email');
    await submitButton.click();
    
    // Should show email validation error
    await expect(page.locator('text=/valid email|invalid email/i')).toBeVisible();
  });
  
  test('should validate password strength', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Enter valid email and weak password
    await emailInput.fill('test@example.com');
    await passwordInput.fill('123');
    await submitButton.click();
    
    // Should show password strength error
    await expect(page.locator('text=/password|weak|strong|length/i')).toBeVisible();
  });
  
  test('should complete signup with valid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Fill in valid credentials
    await emailInput.fill('test.integration@example.com');
    await passwordInput.fill('SecurePass123!');
    await submitButton.click();
    
    // Should redirect to onboarding or dashboard
    await page.waitForURL(/onboard|dashboard|verify|welcome|pricing/, { timeout: 10000 });
  });
  
  test('should show error for existing email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Try to signup with existing email
    await emailInput.fill('existing@example.com');
    await passwordInput.fill('SecurePass123!');
    await submitButton.click();
    
    // Should show error about existing account
    await expect(page.locator('text=/already exist|account exist|email exist/i')).toBeVisible();
  });
  
  test('should have link to sign in', async ({ page }) => {
    const signInLink = page.locator('a').filter({ hasText: /[Ss]ign [Ii]n|[Ll]og [Ii]n/ });
    await expect(signInLink.first()).toBeVisible();
  });
});

test.describe('Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });
  
  test('should display signin form', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });
  
  test('should sign in with valid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    // Should redirect to dashboard
    await page.waitForURL(/dashboard|home/, { timeout: 10000 });
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // Should show error
    await expect(page.locator('text=/invalid|incorrect|wrong|error/i')).toBeVisible();
  });
  
  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a').filter({ hasText: /[Ff]orgot|[Rr]eset/ });
    await expect(forgotLink.first()).toBeVisible();
  });
  
  test('should have link to sign up', async ({ page }) => {
    const signUpLink = page.locator('a').filter({ hasText: /[Ss]ign [Uu]p|[Cc]reate [Aa]ccount/ });
    await expect(signUpLink.first()).toBeVisible();
  });
});

test.describe('Clerk Auth Integration', () => {
  test('should load Clerk sign-in component', async ({ page }) => {
    await page.goto('/signin');
    
    // Look for Clerk-specific elements or iframe
    const clerkElement = page.locator('[data-clerk-id], iframe[title*="Clerk"], .cl-rootBox');
    
    // Clerk might load with a slight delay
    await expect(clerkElement.or(page.locator('form'))).toBeVisible();
  });
  
  test('should maintain session after page reload', async ({ page }) => {
    // Sign in first
    await page.goto('/signin');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard (session maintained)
    await expect(page).toHaveURL(/dashboard/);
  });
  
  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without signing in
    await page.goto('/dashboard');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/signin|login|auth/);
  });
});
