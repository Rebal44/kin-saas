// src/routes/whatsapp.ts
// WhatsApp webhook routes (Twilio)

import { Router, Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp';
import { kinBackendService } from '../services/kin';
import { 
  findOrCreateUser, 
  saveMessage, 
  getConversationHistory 
} from '../db/client';
import { logger } from '../utils/logger';
import { verifyTwilioRequest, rateLimit } from '../middleware/auth';

const router = Router();

// Apply rate limiting
router.use(rateLimit(100, 60000));

// WhatsApp webhook endpoint - POST /api/webhooks/whatsapp
router.post('/', verifyTwilioRequest, async (req: Request, res: Response) => {
  try {
    // Parse incoming message
    const payload = whatsappService.parseWebhookPayload(req.body);
    if (!payload) {
      logger.warn('Invalid WhatsApp webhook payload');
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    // Extract user info
    const { phoneNumber, profileName, waId } = whatsappService.extractUserInfo(payload);
    const messageText = payload.Body;
    const messageSid = payload.MessageSid;

    logger.info(`WhatsApp message from ${phoneNumber}: ${messageText.substring(0, 50)}...`);

    // Check for control commands
    const command = whatsappService.isControlCommand(messageText);
    
    if (command === 'stop') {
      await handleStopCommand(phoneNumber);
      res.status(200).send('OK');
      return;
    }

    if (command === 'start') {
      await handleStartCommand(phoneNumber, profileName, messageText);
      res.status(200).send('OK');
      return;
    }

    if (command === 'help') {
      await whatsappService.sendHelpMessage(phoneNumber);
      res.status(200).send('OK');
      return;
    }

    // Process regular message
    await handleRegularMessage(phoneNumber, waId, messageText, messageSid, profileName);

    // Respond to Twilio
    res.status(200).send('OK');

  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle START command
async function handleStartCommand(
  phoneNumber: string,
  profileName: string | undefined,
  fullMessage: string
) {
  try {
    // Check if message contains connection token (START <token>)
    const parts = fullMessage.split(' ');
    const token = parts.length > 1 ? parts[1] : null;

    // Find or create user
    const user = await findOrCreateUser('whatsapp', phoneNumber, {
      phoneNumber,
      firstName: profileName,
    });

    // Send welcome message
    await whatsappService.sendWelcomeMessage(phoneNumber, profileName);

    // Register with Kin backend
    await kinBackendService.registerUserConnection(
      user.id,
      'whatsapp',
      phoneNumber,
      { phoneNumber, firstName: profileName }
    );

    logger.info(`WhatsApp user connected: ${phoneNumber}`);

  } catch (error) {
    logger.error('Error handling START command:', error);
    await whatsappService.sendMessage(
      phoneNumber,
      'Sorry, there was an error connecting. Please try again later.'
    );
  }
}

// Handle STOP command
async function handleStopCommand(phoneNumber: string) {
  logger.info(`User opted out: ${phoneNumber}`);
  
  // Send opt-out confirmation
  await whatsappService.sendMessage(
    phoneNumber,
    'You have been unsubscribed from Kin messages. Reply START to resubscribe.'
  );

  // In production, update user record to mark as opted out
  // await updateUserOptOut(phoneNumber, true);
}

// Handle regular user message
async function handleRegularMessage(
  phoneNumber: string,
  waId: string,
  text: string,
  messageSid: string,
  profileName?: string
) {
  try {
    // Find or create user
    const user = await findOrCreateUser('whatsapp', phoneNumber, {
      phoneNumber,
      firstName: profileName,
    });

    // Save incoming message
    await saveMessage({
      platform: 'whatsapp',
      platform_message_id: messageSid,
      user_id: user.id,
      chat_id: phoneNumber,
      content: text,
      direction: 'inbound',
      status: 'delivered',
      metadata: { profileName, waId },
    });

    // Get conversation history
    const history = await getConversationHistory(user.id, 20);

    // Forward to Kin backend
    const kinResponse = await kinBackendService.processMessage(
      user.id,
      'whatsapp',
      text,
      history
    );

    if (kinResponse) {
      // Send response back to user
      const sendResult = await whatsappService.sendMessage(
        phoneNumber,
        kinResponse.response
      );

      // Save outgoing message
      if (sendResult.success) {
        await saveMessage({
          platform: 'whatsapp',
          platform_message_id: sendResult.messageId || 'unknown',
          user_id: user.id,
          chat_id: phoneNumber,
          content: kinResponse.response,
          direction: 'outbound',
          status: 'sent',
        });
      }
    } else {
      // Fallback response
      await whatsappService.sendMessage(
        phoneNumber,
        "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment."
      );
    }

  } catch (error) {
    logger.error('Error handling WhatsApp message:', error);
    await whatsappService.sendMessage(
      phoneNumber,
      'Sorry, an error occurred. Please try again later.'
    );
  }
}

// Generate QR code for connection - GET /api/webhooks/whatsapp/qr
router.get('/qr', async (req: Request, res: Response) => {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const result = await whatsappService.generateConnectionQR(userId);
  
  if (!result) {
    res.status(500).json({ error: 'Failed to generate QR code' });
    return;
  }

  res.json({
    qrCode: result.qrCode, // Base64 data URL
    waLink: result.waLink,
    instructions: 'Scan the QR code or click the link to open WhatsApp and start chatting with Kin.',
  });
});

// Get connection link - GET /api/webhooks/whatsapp/connect
router.get('/connect', async (req: Request, res: Response) => {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const result = await whatsappService.generateConnectionQR(userId);
  
  if (!result) {
    res.status(500).json({ error: 'Failed to generate connection link' });
    return;
  }

  // Return HTML page with QR code for easy scanning
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connect to Kin via WhatsApp</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          box-sizing: border-box;
        }
        .container {
          background: white;
          color: #333;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { margin-top: 0; color: #667eea; }
        .qr-code {
          margin: 20px 0;
          max-width: 300px;
        }
        .qr-code img {
          width: 100%;
          border-radius: 10px;
        }
        .button {
          display: inline-block;
          background: #25d366;
          color: white;
          padding: 15px 30px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .button:hover { transform: scale(1.05); }
        .instructions {
          margin-top: 20px;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 Connect to Kin</h1>
        <p>Scan the QR code or click the button below to start chatting with Kin on WhatsApp.</p>
        
        <div class="qr-code">
          <img src="${result.qrCode}" alt="WhatsApp QR Code">
        </div>
        
        <a href="${result.waLink}" class="button">Open WhatsApp</a>
        
        <p class="instructions">
          After opening WhatsApp, send the pre-filled message to connect your account.
        </p>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
