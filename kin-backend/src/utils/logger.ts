import winston from 'winston';
import Sentry from '@sentry/node';

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'kin-saas-api',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

// Structured logging helpers
export const log = {
  info: (message: string, meta?: object) => {
    logger.info(message, meta);
  },
  
  warn: (message: string, meta?: object) => {
    logger.warn(message, meta);
  },
  
  error: (message: string, error?: Error, meta?: object) => {
    logger.error(message, { 
      error: error?.message,
      stack: error?.stack,
      ...meta 
    });
    
    // Also report to Sentry
    if (process.env.SENTRY_DSN && error) {
      Sentry.captureException(error, { extra: meta });
    }
  },
  
  debug: (message: string, meta?: object) => {
    logger.debug(message, meta);
  },
  
  // Request logging
  request: (req: any, res: any, duration: number) => {
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  },
  
  // Audit logging for security events
  audit: (action: string, userId: string, details: object) => {
    logger.info('Audit event', {
      type: 'audit',
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Webhook logging
  webhook: (source: string, eventType: string, success: boolean, meta?: object) => {
    logger.info('Webhook processed', {
      type: 'webhook',
      source,
      eventType,
      success,
      ...meta
    });
  }
};

// Performance monitoring
export function startPerformanceMonitoring(operationName: string) {
  const start = Date.now();
  const transaction = Sentry.startTransaction({
    op: operationName,
    name: operationName
  });
  
  return {
    finish: (status: 'ok' | 'error' = 'ok') => {
      const duration = Date.now() - start;
      transaction.finish();
      
      log.debug(`Operation ${operationName} completed`, {
        operation: operationName,
        duration,
        status
      });
      
      return duration;
    }
  };
}

export default logger;
export { Sentry };
