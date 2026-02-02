// Vercel Analytics configuration
export const analyticsConfig = {
  // Enable analytics in production only
  enabled: process.env.NODE_ENV === 'production',
  
  // Custom events to track
  events: {
    // User events
    USER_SIGNUP: 'user_signup',
    USER_LOGIN: 'user_login',
    USER_SUBSCRIBE: 'user_subscribe',
    USER_CANCEL: 'user_cancel',
    
    // Bot events
    BOT_CONNECT_WHATSAPP: 'bot_connect_whatsapp',
    BOT_CONNECT_TELEGRAM: 'bot_connect_telegram',
    BOT_MESSAGE_RECEIVED: 'bot_message_received',
    BOT_MESSAGE_SENT: 'bot_message_sent',
    
    // Payment events
    CHECKOUT_INITIATED: 'checkout_initiated',
    CHECKOUT_COMPLETED: 'checkout_completed',
    CHECKOUT_FAILED: 'checkout_failed',
    
    // Feature usage
    DASHBOARD_VIEW: 'dashboard_view',
    SETTINGS_VIEW: 'settings_view',
    PORTAL_OPENED: 'portal_opened'
  }
};

// Analytics helper for tracking custom events
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (typeof window === 'undefined') return;
  
  // Vercel Analytics
  if (window.va) {
    window.va('event', {
      name: eventName,
      ...properties
    });
  }
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties);
  }
}

// Page view tracking
export function trackPageView(url: string) {
  if (typeof window === 'undefined') return;
  
  if (window.va) {
    window.va('pageview', { path: url });
  }
}

// User identification for analytics
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  if (window.va) {
    window.va('identify', {
      userId,
      ...traits
    });
  }
}

export default analyticsConfig;
