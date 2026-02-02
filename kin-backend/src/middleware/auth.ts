import { Request, Response, NextFunction } from 'express';
import { requireAuth as clerkRequireAuth, getAuth } from '@clerk/express';
import { supabase } from '../db/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscriptionStatus?: string;
      };
      id: string;
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: Date;
      };
    }
  }
}

// Clerk authentication middleware
export function requireAuth() {
  return clerkRequireAuth();
}

// Optional auth middleware (sets user if authenticated, continues regardless)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    
    if (auth?.userId) {
      // Get user from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, subscription_status')
        .eq('clerk_id', auth.userId)
        .single();

      if (!error && user) {
        req.user = {
          id: auth.userId,
          email: user.email,
          subscriptionStatus: user.subscription_status
        };
      }
    }
  } catch (error) {
    // Continue without user
  }
  
  next();
}

// Require active subscription
export function requireSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.subscriptionStatus !== 'active' && req.user.subscriptionStatus !== 'trialing') {
    return res.status(403).json({ 
      error: 'Active subscription required',
      upgradeUrl: '/pricing'
    });
  }

  next();
}

// Check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check admin list (could be stored in env or database)
  const adminIds = process.env.ADMIN_USER_IDS?.split(',') || [];
  
  if (!adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// API key authentication for bot webhooks
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate API key
  const validApiKeys = [
    process.env.TELEGRAM_WEBHOOK_SECRET,
    process.env.WHATSAPP_WEBHOOK_SECRET
  ].filter(Boolean);

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

// Bot platform authentication
export function requireBotAuth(platform: 'telegram' | 'whatsapp') {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = platform === 'telegram' 
      ? req.headers['x-telegram-bot-api-secret-token']
      : req.headers['x-whatsapp-webhook-token'];

    const expectedToken = platform === 'telegram'
      ? process.env.TELEGRAM_WEBHOOK_SECRET
      : process.env.WHATSAPP_WEBHOOK_SECRET;

    if (token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid bot authentication' });
    }

    next();
  };
}

export default {
  requireAuth,
  optionalAuth,
  requireSubscription,
  requireAdmin,
  requireApiKey,
  requireBotAuth
};
