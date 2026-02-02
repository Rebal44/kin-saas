/**
 * POST /api/webhooks/whatsapp
 * Handle incoming WhatsApp messages (Meta Webhooks)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';
import { handleError, successResponse } from '../../lib/errors';

interface WhatsAppMessage {
  from: string; // phone number
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
  };
  audio?: {
    id: string;
    mime_type: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
  };
}

interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    wa_id: string;
    profile: { name: string };
  }>;
  messages?: WhatsAppMessage[];
}

interface WhatsAppEntry {
  id: string;
  changes: Array<{
    value: WhatsAppValue;
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

// GET for webhook verification
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token matches environment
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST for receiving messages
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: WhatsAppWebhookPayload = await req.json();

    if (payload.object !== 'whatsapp_business_account') {
      return successResponse({ ok: true });
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        
        if (!value.messages) continue;

        for (const msg of value.messages) {
          await handleIncomingMessage(msg);
        }
      }
    }

    return successResponse({ ok: true });
  } catch (error) {
    // Return 200 to prevent Meta retries
    console.error('WhatsApp webhook error:', error);
    return successResponse({ ok: true });
  }
}

async function handleIncomingMessage(msg: WhatsAppMessage): Promise<void> {
  const phoneNumber = msg.from;

  // Find connection
  const { data: connection } = await supabaseAdmin
    .from('bot_connections')
    .select('user_id, id')
    .eq('platform', 'whatsapp')
    .eq('external_id', phoneNumber)
    .eq('is_active', true)
    .single();

  if (!connection) {
    console.log(`No connection found for WhatsApp ${phoneNumber}`);
    return;
  }

  // Build message text and metadata
  let text = '';
  const metadata: Record<string, unknown> = {};

  if (msg.text) {
    text = msg.text.body;
  } else if (msg.image) {
    text = '[Image]';
    metadata.attachments = [{
      type: 'image',
      id: msg.image.id,
      mime_type: msg.image.mime_type,
    }];
  } else if (msg.audio) {
    text = '[Audio]';
    metadata.attachments = [{
      type: 'audio',
      id: msg.audio.id,
      mime_type: msg.audio.mime_type,
    }];
  } else if (msg.document) {
    text = `[Document: ${msg.document.filename}]`;
    metadata.attachments = [{
      type: 'document',
      id: msg.document.id,
      filename: msg.document.filename,
      mime_type: msg.document.mime_type,
    }];
  }

  // Store conversation
  await supabaseAdmin.from('conversations').insert({
    user_id: connection.user_id,
    bot_connection_id: connection.id,
    direction: 'inbound',
    message: text,
    metadata,
  });

  // Log usage
  await supabaseAdmin.from('usage_logs').insert({
    user_id: connection.user_id,
    action_type: 'message',
    credits_used: 1,
  });

  // TODO: Trigger AI response
}
