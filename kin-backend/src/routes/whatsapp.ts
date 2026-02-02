// src/routes/whatsapp.ts
// WhatsApp webhook and API routes

import { Router, Request, Response } from 'express';
import { 
  handleWhatsAppWebhook,
  handleWhatsAppVerification,
  getWhatsAppWebhookInfo,
} from '../handlers/whatsapp';
import { whatsAppService } from '../services/whatsapp';
import { messageRelayService } from '../services/messageRelay';
import { createBotConnection, getBotConnectionsByUserId } from '../db';
import { logger } from '../utils';
import { rateLimit } from '../middleware/rateLimit';
import QRCode from 'qrcode';

const router = Router();

// Apply rate limiting
router.use(rateLimit(100, 60000));

// WhatsApp webhook verification (GET) - /api/webhooks/whatsapp
router.get('/', handleWhatsAppVerification);

// WhatsApp webhook messages (POST) - /api/webhooks/whatsapp  
router.post('/', handleWhatsAppWebhook);

// Get webhook info - GET /api/webhooks/whatsapp/info
router.get('/info', getWhatsAppWebhookInfo);

// Generate connection QR code - GET /api/webhooks/whatsapp/qr?userId=xxx
router.get('/qr', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: userId,
      platform: 'whatsapp',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({ error: 'Failed to create connection' });
      return;
    }

    // Get the WhatsApp Business number from env
    const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER?.replace('+', '') || '';
    
    if (!phoneNumber) {
      res.status(500).json({ error: 'WhatsApp phone number not configured' });
      return;
    }

    // Generate WhatsApp click-to-chat link with connection token
    const message = `START ${connection.id}`;
    const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(waLink, {
      width: 400,
      margin: 2,
      color: {
        dark: '#25d366',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      connectionId: connection.id,
      qrCode: qrCodeDataUrl,
      waLink,
      instructions: 'Scan the QR code with your phone or click the link to open WhatsApp and connect.',
    });

  } catch (error) {
    logger.error('Error generating WhatsApp QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get connection page with QR code - GET /api/webhooks/whatsapp/connect?userId=xxx
router.get('/connect', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: userId,
      platform: 'whatsapp',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({ error: 'Failed to create connection' });
      return;
    }

    // Get the WhatsApp Business number
    const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER?.replace('+', '') || '';
    
    if (!phoneNumber) {
      res.status(500).json({ error: 'WhatsApp phone number not configured' });
      return;
    }

    // Generate WhatsApp link
    const message = `START ${connection.id}`;
    const waLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(waLink, {
      width: 400,
      margin: 2,
      color: {
        dark: '#25d366',
        light: '#ffffff',
      },
    });

    // Return HTML page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Connect to Kin via WhatsApp</title>
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
      background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
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
    h1 { margin-bottom: 10px; color: #25d366; }
    p { color: #666; margin-bottom: 20px; line-height: 1.5; }
    .qr-code {
      margin: 20px 0;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 15px;
    }
    .qr-code img {
      width: 100%;
      max-width: 300px;
      border-radius: 10px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #25d366;
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
      background: #128c7e;
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
    .phone-number {
      font-family: monospace;
      background: #e8f5e9;
      padding: 4px 8px;
      border-radius: 4px;
      color: #25d366;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">💬</div>
    <h1>Connect to Kin</h1>
    <p>Chat with Kin directly in WhatsApp</p>
    
    <div class="qr-code">
      <img src="${qrCodeDataUrl}" alt="WhatsApp QR Code">
    </div>
    
    <a href="${waLink}" class="button">
      <span>Open in WhatsApp</span>
    </a>
    
    <div class="steps">
      <ol>
        <li>Scan the QR code or click the button</li>
        <li>Tap <strong>Send</strong> to connect your account</li>
        <li>Start chatting with Kin!</li>
      </ol>
    </div>
    
    <p style="font-size: 14px;">
      Number: <span class="phone-number">+${phoneNumber}</span>
    </p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    logger.error('Error generating WhatsApp connect page:', error);
    res.status(500).json({ error: 'Failed to generate page' });
  }
});

// Complete connection (called from dashboard after user verification)
// POST /api/webhooks/whatsapp/complete-connection
router.post('/complete-connection', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber } = req.body;

    if (!userId || !phoneNumber) {
      res.status(400).json({ error: 'userId and phoneNumber are required' });
      return;
    }

    // Complete the connection
    const connection = await messageRelayService.completeConnection(
      userId,
      'whatsapp',
      phoneNumber
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
    logger.error('Error completing WhatsApp connection:', error);
    res.status(500).json({ error: 'Failed to complete connection' });
  }
});

export default router;
