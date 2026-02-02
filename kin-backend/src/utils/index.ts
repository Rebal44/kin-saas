import QRCode from 'qrcode';
import crypto from 'crypto';
import winston from 'winston';

// Logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kin-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Generate a unique connection token
export function generateConnectionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate QR code as data URL
export async function generateQRCode(data: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    logger.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      width: 400,
      margin: 2,
    });
    return svg;
  } catch (error) {
    logger.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

// Verify WhatsApp webhook signature
export function verifyWhatsAppSignature(
  body: string,
  signature: string,
  appSecret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(body, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Error verifying WhatsApp signature:', error);
    return false;
  }
}

// Verify Telegram webhook secret
export function verifyTelegramSecret(
  token: string,
  secretToken: string
): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(secretToken)
  );
}

// Format phone number (remove non-numeric chars, ensure country code)
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If no country code, assume US (+1)
  if (cleaned.length === 10) {
    return `1${cleaned}`;
  }
  
  return cleaned;
}

// Truncate message for logging
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength)}...`;
}

// Generate connection link for Telegram bot
export function generateTelegramBotLink(botUsername: string, startParam: string): string {
  return `https://t.me/${botUsername}?start=${startParam}`;
}

// Generate deep link for WhatsApp
export function generateWhatsAppDeepLink(phoneNumber: string, message?: string): string {
  const baseUrl = `https://wa.me/${phoneNumber}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

// Delay function for rate limiting
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delayMs = baseDelay * Math.pow(2, i);
      logger.warn(`Retry ${i + 1}/${maxRetries} after ${delayMs}ms: ${lastError.message}`);
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Parse JSON safely
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}