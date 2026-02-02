/**
 * Dashboard Integration Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('/signin');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('user@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });
  
  test('should load dashboard', async ({ page }) => {
    // Should be on dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Dashboard content should be visible
    const dashboard = page.locator('[data-testid="dashboard"], main, .dashboard').first();
    await expect(dashboard).toBeVisible();
  });
  
  test('should display user welcome message', async ({ page }) => {
    // Should show welcome with user name or email
    const welcome = page.locator('h1, h2, .welcome').first();
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText(/[Ww]elcome|Hi|Hello/);
  });
  
  test('should have navigation sidebar', async ({ page }) => {
    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible();
    
    // Should have navigation links
    const navLinks = sidebar.locator('a, button');
    expect(await navLinks.count()).toBeGreaterThan(0);
  });
  
  test('should display connection status', async ({ page }) => {
    // Should show bot connection status
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, .status').first();
    await expect(connectionStatus).toBeVisible();
  });
  
  test('should navigate to connections page', async ({ page }) => {
    // Click on connections link
    const connectionsLink = page.locator('a, button').filter({ hasText: /[Cc]onnections?|[Bb]ots?|[Ll]ink/ }).first();
    await connectionsLink.click();
    
    // Should navigate to connections page
    await expect(page).toHaveURL(/connections?|bots?/);
  });
  
  test('should navigate to settings', async ({ page }) => {
    // Click on settings link
    const settingsLink = page.locator('a, button').filter({ hasText: /[Ss]ettings|[Cc]onfig/ }).first();
    await settingsLink.click();
    
    // Should navigate to settings
    await expect(page).toHaveURL(/settings?|config/);
  });
  
  test('should have sign out button', async ({ page }) => {
    const signOutButton = page.locator('button, a').filter({ hasText: /[Ss]ign [Oo]ut|[Ll]ogout|[Ll]eave/ }).first();
    await expect(signOutButton).toBeVisible();
  });
});

test.describe('QR Code Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in and go to connections
    await page.goto('/signin');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('user@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Navigate to connections
    await page.goto('/connections');
  });
  
  test('should display platform selection', async ({ page }) => {
    // Should have WhatsApp option
    const whatsappOption = page.locator('button, a, div').filter({ hasText: /[Ww]hatsApp/ }).first();
    await expect(whatsappOption).toBeVisible();
    
    // Should have Telegram option
    const telegramOption = page.locator('button, a, div').filter({ hasText: /[Tt]elegram/ }).first();
    await expect(telegramOption).toBeVisible();
  });
  
  test('should generate WhatsApp QR code', async ({ page }) => {
    // Click WhatsApp option
    const whatsappOption = page.locator('button, a, div').filter({ hasText: /[Ww]hatsApp/ }).first();
    await whatsappOption.click();
    
    // Should show QR code
    const qrCode = page.locator('img[alt*="QR"], canvas, [data-testid="qr-code"], .qr-code').first();
    await expect(qrCode).toBeVisible({ timeout: 10000 });
    
    // Or should show instructions
    const instructions = page.locator('text=/[Ss]can|[Qq]R|[Cc]ode/');
    await expect(instructions.first()).toBeVisible();
  });
  
  test('should generate Telegram bot link', async ({ page }) => {
    // Click Telegram option
    const telegramOption = page.locator('button, a, div').filter({ hasText: /[Tt]elegram/ }).first();
    await telegramOption.click();
    
    // Should show Telegram bot link
    const botLink = page.locator('a[href*="t.me"], text=/t\\.me/').first();
    await expect(botLink).toBeVisible();
    
    // Should have instructions
    await expect(page.locator('text=/[Ss]tart|[Bb]ot|[Ll]ink/').first()).toBeVisible();
  });
  
  test('should show connection status', async ({ page }) => {
    // Should show if already connected
    const status = page.locator('[data-testid="connection-status"], .status, .connected').first();
    
    // If connected, show connected status
    if (await page.locator('text=/[Cc]onnected/).count() > 0) {
      await expect(page.locator('text=/[Cc]onnected/')).toBeVisible();
    }
  });
  
  test('should allow disconnecting bot', async ({ page }) => {
    // Look for disconnect button if connected
    const disconnectButton = page.locator('button, a').filter({ hasText: /[Dd]isconnect|[Uu]nlink|[Rr]emove/ }).first();
    
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      
      // Should show confirmation or update status
      await expect(page.locator('text=/[Dd]isconnect|[Cc]onfirm/').first()).toBeVisible();
    }
  });
});

test.describe('Conversations', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('/signin');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('user@example.com');
    await passwordInput.fill('correctpassword');
    await submitButton.click();
    
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });
  
  test('should display conversations list', async ({ page }) => {
    await page.goto('/conversations');
    
    // Should show conversations
    const conversations = page.locator('[data-testid="conversation"], .conversation, .chat').first();
    await expect(conversations).toBeVisible();
  });
  
  test('should show conversation details', async ({ page }) => {
    await page.goto('/conversations');
    
    // Click on first conversation
    const firstConversation = page.locator('[data-testid="conversation"], .conversation').first();
    await firstConversation.click();
    
    // Should show messages
    const messages = page.locator('[data-testid="message"], .message, .chat-message').first();
    await expect(messages).toBeVisible();
  });
  
  test('should show platform indicator for each conversation', async ({ page }) => {
    await page.goto('/conversations');
    
    // Should show WhatsApp or Telegram icon/label
    const platformIndicator = page.locator('text=/[Ww]hatsApp|[Tt]elegram|📱|💬/').first();
    await expect(platformIndicator).toBeVisible();
  });
});
