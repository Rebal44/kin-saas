/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscriptionStatus?: string;
        isAdmin?: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Clerk
 */
export async function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }
    
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }
    
    // Verify token with Clerk
    const session = await clerk.sessions.verifyToken(token);
    
    if (!session) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    // Get user details
    const user = await clerk.users.getUser(session.sub);
    
    req.user = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require active subscription
 */
export function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const allowedStatuses = ['active', 'trialing'];
  
  if (!req.user.subscriptionStatus || !allowedStatuses.includes(req.user.subscriptionStatus)) {
    res.status(403).json({ error: 'Active subscription required' });
    return;
  }
  
  next();
}

/**
 * Middleware to require admin access
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}
