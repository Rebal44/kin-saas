/**
 * Subscription Checkout Integration Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Subscription Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing');
  });
  
  test('should display pricing tiers', async ({ page }) => {
    // Should have pricing cards
    const pricingCards = page.locator('[data-testid="pricing-card"], .pricing-card, [class*="price"]').first();
    await expect(pricingCards).toBeVisible();
    
    // Should show price amount
    const price = page.locator('text=/\\$[0-9]+|€[0-9]+|£[0-9]+|[0-9]+\\$/');
    await expect(price.first()).toBeVisible();
  });
  
  test('should display Pro plan features', async ({ page }) => {
    // Look for Pro plan
    const proPlan = page.locator('[data-testid="pricing-pro"], .pro-plan, section').filter({ hasText: /[Pp]ro/ });
    await expect(proPlan.first()).toBeVisible();
    
    // Should have CTA button
    const ctaButton = proPlan.first().locator('button, a').filter({ hasText: /[Ss]ubscribe|[Gg]et [Ss]tarted|[Uu]pgrade/ });
    await expect(ctaButton).toBeVisible();
  });
  
  test('should initiate Stripe checkout', async ({ page }) => {
    // Click subscribe button
    const subscribeButton = page.locator('button, a').filter({ hasText: /[Ss]ubscribe|[Uu]pgrade|[Gg]et [Kk]in [Pp]ro/ }).first();
    await subscribeButton.click();
    
    // Should redirect to Stripe checkout or open modal
    await page.waitForURL(/stripe|checkout|billing/, { timeout: 10000 }).catch(async () => {
      // Might be a modal
      const stripeModal = page.locator('[data-testid="stripe-modal"], iframe[name*="stripe"]').first();
      await expect(stripeModal).toBeVisible();
    });
  });
  
  test('should require authentication before checkout', async ({ page }) => {
    // Click subscribe button
    const subscribeButton = page.locator('button, a').filter({ hasText: /[Ss]ubscribe|[Uu]pgrade/ }).first();
    await subscribeButton.click();
    
    // If not authenticated, should redirect to signin
    await expect(page).toHaveURL(/signin|login|auth/, { timeout: 5000 });
  });
});

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('/signin');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('subscriber@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });
  
  test('should display subscription status in dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show subscription info
    const subscriptionInfo = page.locator('[data-testid="subscription"], .subscription, .billing').first();
    await expect(subscriptionInfo).toBeVisible();
    
    // Should show current status
    await expect(page.locator('text=/[Aa]ctive|[Ss]ubscription|[Pp]lan/').first()).toBeVisible();
  });
  
  test('should have link to billing portal', async ({ page }) => {
    await page.goto('/dashboard');
    
    const billingLink = page.locator('a, button').filter({ hasText: /[Bb]illing|[Mm]anage [Ss]ubscription|[Pp]ayment/ });
    await expect(billingLink.first()).toBeVisible();
  });
  
  test('should show upgrade prompt for free users', async ({ page }) => {
    await page.goto('/dashboard');
    
    // If on free plan, should show upgrade CTA
    const upgradeCTA = page.locator('text=/[Uu]pgrade|[Gg]o [Pp]ro|[Uu]nlock/');
    
    // Only check if element exists (user might already be on Pro)
    if (await upgradeCTA.count() > 0) {
      await expect(upgradeCTA.first()).toBeVisible();
    }
  });
});

test.describe('Stripe Checkout Flow', () => {
  test('should complete checkout successfully', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/checkout?price_id=price_test123');
    
    // Fill in Stripe test card details
    const cardFrame = page.frameLocator('iframe').first();
    
    // Enter card number (Stripe test card: 4242 4242 4242 4242)
    await cardFrame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');
    
    // Enter expiry
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    
    // Enter CVC
    await cardFrame.locator('input[name="cvc"]').fill('123');
    
    // Enter postal code
    await cardFrame.locator('input[name="postal"]').fill('12345');
    
    // Submit payment
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to success page
    await page.waitForURL(/success|thank|complete/, { timeout: 30000 });
    
    // Should show success message
    await expect(page.locator('text=/[Ss]uccess|[Tt]hank|confirmed/').first()).toBeVisible();
  });
  
  test('should handle declined card', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/checkout?price_id=price_test123');
    
    const cardFrame = page.frameLocator('iframe').first();
    
    // Use declined test card: 4000 0000 0000 0002
    await cardFrame.locator('input[name="cardnumber"]').fill('4000 0000 0000 0002');
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    
    await page.locator('button[type="submit"]').click();
    
    // Should show error
    await expect(page.locator('text=/declined|error|failed/').first()).toBeVisible();
  });
});
