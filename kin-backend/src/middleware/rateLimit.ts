import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { Request, Response } from 'express';

// Redis client for rate limiting (optional - falls back to memory store)
const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

// Rate limit configurations
export const rateLimitConfigs = {
  // General API rate limit
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    message: {
      error: 'Too many requests',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for webhook endpoints
    skip: (req: Request) => {
      return req.path.startsWith('/api/webhooks/');
    },
    // Custom key generator (use user ID if authenticated, otherwise IP)
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now() + 60000 - Date.now()) / 1000)
      });
    }
  }),

  // Strict rate limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
      error: 'Too many authentication attempts',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  }),

  // Rate limit for webhook endpoints (higher limit but still protected)
  webhook: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    message: { error: 'Too many webhook requests' },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Rate limit for bot message processing
  bot: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute per user
    message: {
      error: 'Message rate limit exceeded',
      retryAfter: 60
    },
    standardHeaders: true,
    keyGenerator: (req: Request) => {
      // Rate limit by platform user ID
      return req.body?.from || req.ip;
    }
  })
};

// Sliding window rate limiter for subscription-based tiers
export function createTieredRateLimiter(tier: 'free' | 'pro' | 'enterprise') {
  const limits = {
    free: { requests: 20, window: 60000 },     // 20 requests/minute
    pro: { requests: 100, window: 60000 },     // 100 requests/minute
    enterprise: { requests: 500, window: 60000 } // 500 requests/minute
  };

  const config = limits[tier];

  return rateLimit({
    windowMs: config.window,
    max: config.requests,
    message: {
      error: `Rate limit exceeded for ${tier} tier`,
      upgradeUrl: '/pricing'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

// Middleware to check subscription tier and apply appropriate rate limit
export async function tieredRateLimit(req: Request, res: Response, next: Function) {
  // Default to free tier
  let tier: 'free' | 'pro' | 'enterprise' = 'free';

  if (req.user) {
    // Get user's subscription status from database
    const { data: user } = await req.app.locals.supabase
      .from('users')
      .select('subscription_status')
      .eq('clerk_id', req.user.id)
      .single();

    if (user?.subscription_status === 'active') {
      tier = 'pro';
    }
    // Add enterprise check if needed
  }

  const limiter = createTieredRateLimiter(tier);
  return limiter(req, res, next);
}

export default rateLimitConfigs;
