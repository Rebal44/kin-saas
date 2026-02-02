/**
 * End-to-End User Journey Tests
 * 
 * Complete flow: Visit → Sign Up → Subscribe → Connect Bot → Send Message
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey - WhatsApp Flow', () => {
  test('full user journey', async ({ page }) => {
    // Step 1: Visit landing page
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // Step 2: Navigate to signup
    const getStartedButton = page.locator('a, button').filter({ hasText: /[Gg]et [Ss]tarted|[Ss]ign [Uu]p/ }).first();
    await getStartedButton.click();
    await page.waitForURL(/signup|signin|auth/);
    
    // Step 3: Sign up
    const timestamp = Date.now();
    const testEmail = `test.e2e.${timestamp}@example.com`;
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill(testEmail);
    await passwordInput.fill('SecurePass123!');
    await submitButton.click();
    
    // Should redirect to onboarding/dashboard
    await page.waitForURL(/dashboard|onboard|welcome|pricing/, { timeout: 15000 });
    
    // Step 4: Subscribe (if on pricing page, otherwise navigate there)
    if (!page.url().includes('pricing')) {
      await page.goto('/pricing');
    }
    
    const subscribeButton = page.locator('button, a').filter({ hasText: /[Ss]ubscribe|[Uu]pgrade|[Gg]et [Pp]ro/ }).first();
    await subscribeButton.click();
    
    // Handle Stripe checkout
    await page.waitForURL(/stripe|checkout/, { timeout: 10000 });
    
    // Fill Stripe test card
    const cardFrame = page.frameLocator('iframe').first();
    await cardFrame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    
    await page.locator('button[type="submit"]').click();
    
    // Wait for success
    await page.waitForURL(/success|dashboard/, { timeout: 30000 });
    
    // Step 5: Connect WhatsApp bot
    await page.goto('/connections');
    
    const whatsappOption = page.locator('button, a, div').filter({ hasText: /[Ww]hatsApp/ }).first();
    await whatsappOption.click();
    
    // Should show QR code
    const qrCode = page.locator('img[alt*="QR"], canvas, [data-testid="qr-code"]').first();
    await expect(qrCode).toBeVisible({ timeout: 15000 });
    
    // Step 6: Verify connection is pending
    await expect(page.locator('text=/[Ss]can|[Cc]onnecting|[Pp]ending/').first()).toBeVisible();
    
    console.log(`✅ WhatsApp journey completed for ${testEmail}`);
  });
});

test.describe('Complete User Journey - Telegram Flow', () => {
  test('full user journey', async ({ page }) => {
    // Step 1-4: Same as WhatsApp (landing → signup → subscribe)
    await page.goto('/');
    
    const getStartedButton = page.locator('a, button').filter({ hasText: /[Gg]et [Ss]tarted|[Ss]ign [Uu]p/ }).first();
    await getStartedButton.click();
    await page.waitForURL(/signup|signin|auth/);
    
    const timestamp = Date.now();
    const testEmail = `test.telegram.${timestamp}@example.com`;
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill(testEmail);
    await passwordInput.fill('SecurePass123!');
    await submitButton.click();
    
    await page.waitForURL(/dashboard|onboard|welcome|pricing/, { timeout: 15000 });
    
    // Subscribe
    if (!page.url().includes('pricing')) {
      await page.goto('/pricing');
    }
    
    const subscribeButton = page.locator('button, a').filter({ hasText: /[Ss]ubscribe|[Uu]pgrade/ }).first();
    await subscribeButton.click();
    
    await page.waitForURL(/stripe|checkout/, { timeout: 10000 });
    
    const cardFrame = page.frameLocator('iframe').first();
    await cardFrame.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/success|dashboard/, { timeout: 30000 });
    
    // Step 5: Connect Telegram bot (different from WhatsApp)
    await page.goto('/connections');
    
    const telegramOption = page.locator('button, a, div').filter({ hasText: /[Tt]elegram/ }).first();
    await telegramOption.click();
    
    // Should show Telegram bot link instead of QR code
    const botLink = page.locator('a[href*="t.me"]').first();
    await expect(botLink).toBeVisible({ timeout: 10000 });
    
    // Should have start button/link
    const startButton = page.locator('a, button').filter({ hasText: /[Ss]tart [Bb]ot|[Oo]pen [Tt]elegram/ }).first();
    await expect(startButton).toBeVisible();
    
    // Verify link format
    const href = await botLink.getAttribute('href');
    expect(href).toMatch(/t\.me\/.+/);
    
    console.log(`✅ Telegram journey completed for ${testEmail}`);
  });
});

test.describe('User Journey - Error Handling', () => {
  test('should handle failed payment gracefully', async ({ page }) => {
    // Navigate through to checkout
    await page.goto('/');
    
    const getStartedButton = page.locator('a, button').filter({ hasText: /[Gg]et [Ss]tarted/ }).first();
    await getStartedButton.click();
    await page.waitForURL(/signup|signin/);
    
    const timestamp = Date.now();
    const testEmail = `test.fail.${timestamp}@example.com`;
    
    await page.locator('input[type="email"]').first().fill(testEmail);
    await page.locator('input[type="password"]').first().fill('SecurePass123!');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL(/dashboard|pricing/, { timeout: 15000 });
    
    if (!page.url().includes('pricing')) {
      await page.goto('/pricing');
    }
    
    await page.locator('button, a').filter({ hasText: /[Ss]ubscribe/ }).first().click();
    await page.waitForURL(/checkout/, { timeout: 10000 });
    
    // Use declined card
    const cardFrame = page.frameLocator('iframe').first();
    await cardFrame.locator('input[name="cardnumber"]').fill('4000 0000 0000 0002');
    await cardFrame.locator('input[name="exp-date"]').fill('12/25');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    
    await page.locator('button[type="submit"]').click();
    
    // Should show error message
    await expect(page.locator('text=/declined|error|failed/').first()).toBeVisible();
  });
  
  test('should handle email already exists', async ({ page }) => {
    await page.goto('/signup');
    
    await page.locator('input[type="email"]').first().fill('existing@example.com');
    await page.locator('input[type="password"]').first().fill('SecurePass123!');
    await page.locator('button[type="submit"]').first().click();
    
    // Should show error
    await expect(page.locator('text=/already exist|account exist/').first()).toBeVisible();
  });
  
  test('should handle weak password', async ({ page }) => {
    await page.goto('/signup');
    
    await page.locator('input[type="email"]').first().fill('new@example.com');
    await page.locator('input[type="password"]').first().fill('123');
    await page.locator('button[type="submit"]').first().click();
    
    // Should show password strength error
    await expect(page.locator('text=/password|weak|strong/').first()).toBeVisible();
  });
});

test.describe('User Journey - Subscription Management', () => {
  test('should allow canceling subscription', async ({ page }) => {
    // Sign in as subscribed user
    await page.goto('/signin');
    await page.locator('input[type="email"]').first().fill('subscribed@example.com');
    await page.locator('input[type="password"]').first().fill('password');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Go to billing/subscription page
    await page.goto('/settings/billing');
    
    // Should have cancel button
    const cancelButton = page.locator('button, a').filter({ hasText: /[Cc]ancel/ }).first();
    await expect(cancelButton).toBeVisible();
    
    // Click cancel
    await cancelButton.click();
    
    // Should show confirmation
    await expect(page.locator('text=/[Cc]onfirm|[Aa]re you sure/').first()).toBeVisible();
  });
  
  test('should show usage statistics', async ({ page }) => {
    // Sign in
    await page.goto('/signin');
    await page.locator('input[type="email"]').first().fill('active@example.com');
    await page.locator('input[type="password"]').first().fill('password');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Should show usage stats
    await expect(page.locator('text=/[Mm]essage|[Uu]sage|[Cc]onversation/').first()).toBeVisible();
  });
});
