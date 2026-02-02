import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabase } from '../db/client';

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://kin-saas.com',
      'https://www.kin-saas.com',
      'https://staging.kin-saas.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Webhook-Signature',
    'Stripe-Signature',
    'Sentry-Trace',
    'Baggage'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  next();
}

// Content Security Policy
export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction) {
  const isDev = process.env.NODE_ENV !== 'production';
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.clerk.com https://api.stripe.com https://*.supabase.co https://*.vercel-insights.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev",
    "media-src 'self'",
    "object-src 'none'",
    isDev ? "upgrade-insecure-requests" : ""
  ].filter(Boolean).join('; ');

  res.setHeader('Content-Security-Policy', csp);
  next();
}

// Verify Stripe webhook signature
export function verifyStripeWebhook(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  // The actual verification happens in the webhook handler
  // This middleware just ensures the header exists
  next();
}

// Verify Clerk webhook signature
export function verifyClerkWebhook(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['svix-signature'] as string;
  const timestamp = req.headers['svix-timestamp'] as string;
  const id = req.headers['svix-id'] as string;

  if (!signature || !timestamp || !id) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  // Verify timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestamp, 10);
  
  if (Math.abs(now - timestampNum) > 300) {
    return res.status(400).json({ error: 'Webhook timestamp too old' });
  }

  // The actual signature verification should be done with Clerk SDK
  // This is just a basic check
  next();
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic XSS prevention
      obj[key] = obj[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Request ID middleware for tracing
export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

// Validate webhook origin
export function validateWebhookOrigin(allowedSources: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const source = req.headers['x-webhook-source'] as string;
    const userAgent = req.headers['user-agent'] || '';

    // Check for known webhook sources
    const isValidSource = allowedSources.some(s => 
      userAgent.includes(s) || source === s
    );

    if (!isValidSource && process.env.NODE_ENV === 'production') {
      // Log suspicious webhook attempts
      console.warn('Invalid webhook origin:', {
        ip: req.ip,
        userAgent,
        source,
        path: req.path
      });
    }

    next();
  };
}

export default {
  corsOptions,
  securityHeaders,
  contentSecurityPolicy,
  verifyStripeWebhook,
  verifyClerkWebhook,
  sanitizeInput,
  requestId,
  validateWebhookOrigin
};
