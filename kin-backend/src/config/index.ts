// src/config/index.ts
// Configuration management for Kin bot integrations

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),
  
  // Twilio (WhatsApp)
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  TWILIO_WEBHOOK_SECRET: z.string().default(''),
  
  // Kin Backend
  KIN_API_URL: z.string().url().default('http://localhost:8000'),
  KIN_API_KEY: z.string().default(''),
  
  // Webhook
  WEBHOOK_BASE_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

// Derived config values
export const WEBHOOK_URLS = {
  telegram: `${config.WEBHOOK_BASE_URL}/api/webhooks/telegram`,
  whatsapp: `${config.WEBHOOK_BASE_URL}/api/webhooks/whatsapp`,
};

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
