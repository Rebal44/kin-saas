// src/routes/telegram.ts
// Telegram webhook and API routes

import { Router, Request, Response } from 'express';
import { 
  handleTelegramWebhook,
  setupTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
} from '../handlers/telegram';
import { telegramService } from '../services/telegram';
import { messageRelayService } from '../services/messageRelay';
import { createBotConnection, getBotConnectionsByUserId } from '../db';
import { logger } from '../utils';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting
router.use(rateLimit(100, 60000));

// Telegram webhook endpoint - POST /api/webhooks/telegram
router.post('/', handleTelegramWebhook);

// Get bot info and webhook status - GET /api/webhooks/telegram/info
router.get('/info', getTelegramWebhookInfo);

// Set webhook - POST /api/webhooks/telegram/set-webhook
router.post('/set-webhook', setupTelegramWebhook);

// Delete webhook - POST /api/webhooks/telegram/delete-webhook
router.post('/delete-webhook', deleteTelegramWebhook);

// Generate connection link for user - GET /api/webhooks/telegram/connect?userId=xxx
router.get('/connect', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get bot info
    const botInfo = await telegramService.getMe();
    if (!botInfo) {
      res.status(500).json({ error: 'Failed to get bot info' });
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: userId,
      platform: 'telegram',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({ error: 'Failed to create connection' });
      return;
    }

    // Generate deep link with connection token
    const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;

    res.json({
      success: true,
      connectionId: connection.id,
      inviteLink: `https://t.me/${botInfo.username}`,
      deepLink,
      botUsername: botInfo.username,
      instructions: 'Click the deep link to open Telegram and start chatting with Kin.',
    });

  } catch (error) {
    logger.error('Error generating Telegram connection:', error);
    res.status(500).json({ error: 'Failed to generate connection' });
  }
});

// Get QR code / connection page HTML - GET /api/webhooks/telegram/qr-page?userId=xxx
router.get('/qr-page', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get bot info
    const botInfo = await telegramService.getMe();
    if (!botInfo) {
      res.status(500).json({ error: 'Failed to get bot info' });
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: userId,
      platform: 'telegram',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({ error: 'Failed to create connection' });
      return;
    }

    const deepLink = `https://t.me/${botInfo.username}?start=${connection.id}`;

    // Return HTML page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Connect to Kin via Telegram</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #0088cc 0%, #00aced 100%);
      color: white;
      padding: 20px;
    }
    .container {
      background: white;
      color: #333;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo {
      font-size: 64px;
      margin-bottom: 10px;
    }
    h1 { margin-bottom: 10px; color: #0088cc; }
    p { color: #666; margin-bottom: 20px; line-height: 1.5; }
    .button {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #0088cc;
      color: white;
      padding: 16px 32px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }
    .button:hover { 
      transform: scale(1.05); 
      background: #0077b3;
    }
    .steps {
      text-align: left;
      margin: 20px 0;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 10px;
    }
    .steps ol {
      margin-left: 20px;
      color: #666;
    }
    .steps li {
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .bot-name {
      font-family: monospace;
      background: #e3f2fd;
      padding: 4px 8px;
      border-radius: 4px;
      color: #0088cc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">✈️</div>
    <h1>Connect to Kin</h1>
    <p>Chat with Kin directly in Telegram</p>
    
    <a href="${deepLink}" class="button">
      <span>Open in Telegram</span>
    </a>
    
    <div class="steps">
      <ol>
        <li>Click the button above to open Telegram</li>
        <li>Tap <strong>Start</strong> to connect your account</li>
        <li>Start chatting with Kin!</li>
      </ol>
    </div>
    
    <p style="font-size: 14px;">
      Bot: <span class="bot-name">@${botInfo.username}</span>
    </p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    logger.error('Error generating Telegram QR page:', error);
    res.status(500).json({ error: 'Failed to generate page' });
  }
});

// Complete connection (called from dashboard after user verification)
// POST /api/webhooks/telegram/complete-connection
router.post('/complete-connection', async (req: Request, res: Response) => {
  try {
    const { userId, chatId } = req.body;

    if (!userId || !chatId) {
      res.status(400).json({ error: 'userId and chatId are required' });
      return;
    }

    // Complete the connection
    const connection = await messageRelayService.completeConnection(
      userId,
      'telegram',
      chatId.toString()
    );

    if (!connection) {
      res.status(500).json({ error: 'Failed to complete connection' });
      return;
    }

    res.json({
      success: true,
      connectionId: connection.id,
      message: 'Connection completed successfully',
    });

  } catch (error) {
    logger.error('Error completing Telegram connection:', error);
    res.status(500).json({ error: 'Failed to complete connection' });
  }
});

export default router;
