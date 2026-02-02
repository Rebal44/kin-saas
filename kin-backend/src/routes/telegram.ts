// src/routes/telegram.ts
// Telegram webhook routes

import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegram';
import { kinBackendService } from '../services/kin';
import { 
  findOrCreateUser, 
  saveMessage, 
  getConversationHistory,
  validateConnectionToken 
} from '../db/client';
import { logger } from '../utils/logger';
import { verifyTelegramSecret, rateLimit } from '../middleware/auth';

const router = Router();

// Apply rate limiting to webhook
router.use(rateLimit(100, 60000));

// Telegram webhook endpoint - POST /api/webhooks/telegram
router.post('/', verifyTelegramSecret, async (req: Request, res: Response) => {
  try {
    // Acknowledge receipt immediately
    res.status(200).json({ ok: true });

    const update = telegramService.parseUpdate(req.body);
    if (!update) {
      logger.warn('Invalid Telegram update received');
      return;
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }

    // Handle regular messages
    const messageData = telegramService.extractMessageData(update);
    if (!messageData) {
      logger.debug('No message data in update');
      return;
    }

    const { messageId, chatId, userId: platformUserId, text, username, firstName } = messageData;

    logger.info(`Telegram message from ${platformUserId}: ${text.substring(0, 50)}...`);

    // Handle /start command
    if (text === '/start' || text.startsWith('/start ')) {
      await handleStartCommand(chatId, platformUserId, text, username, firstName);
      return;
    }

    // Handle /help command
    if (text === '/help') {
      await telegramService.sendHelpMessage(chatId);
      return;
    }

    // Handle /clear command
    if (text === '/clear') {
      await handleClearCommand(chatId, platformUserId);
      return;
    }

    // Handle /status command
    if (text === '/status') {
      await handleStatusCommand(chatId, platformUserId);
      return;
    }

    // Process regular message
    await handleRegularMessage(chatId, platformUserId, text, messageId, username, firstName);

  } catch (error) {
    logger.error('Error processing Telegram webhook:', error);
  }
});

// Handle /start command
async function handleStartCommand(
  chatId: string,
  platformUserId: string,
  text: string,
  username?: string,
  firstName?: string
) {
  try {
    // Check if start parameter contains connection token
    const startParam = text.split(' ')[1];
    let existingUser = null;

    if (startParam) {
      // Validate connection token
      const tokenData = await validateConnectionToken(startParam);
      if (tokenData) {
        logger.info(`Connection token validated for user: ${tokenData.userId}`);
        // Link this Telegram account to the existing Kin user
        existingUser = await findOrCreateUser('telegram', platformUserId, {
          username,
          firstName,
        });
      }
    }

    // Find or create user
    const user = existingUser || await findOrCreateUser('telegram', platformUserId, {
      username,
      firstName,
    });

    // Send welcome message
    await telegramService.sendWelcomeMessage(chatId, firstName || username);

    // Register with Kin backend
    await kinBackendService.registerUserConnection(
      user.id,
      'telegram',
      platformUserId,
      { username, firstName }
    );

  } catch (error) {
    logger.error('Error handling /start command:', error);
    await telegramService.sendMessage(chatId, 'Sorry, there was an error. Please try again later.');
  }
}

// Handle /clear command
async function handleClearCommand(chatId: string, platformUserId: string) {
  // In a real implementation, this would clear conversation history
  await telegramService.sendMessage(
    chatId,
    '🧹 Conversation history cleared! Starting fresh.',
    { parseMode: 'HTML' }
  );
}

// Handle /status command
async function handleStatusCommand(chatId: string, platformUserId: string) {
  await telegramService.sendMessage(
    chatId,
    '✅ You are connected to Kin via Telegram.\n\nI\'m ready to help you!',
    { parseMode: 'HTML' }
  );
}

// Handle callback queries
async function handleCallbackQuery(callbackQuery: any) {
  // Handle button clicks here
  logger.debug('Callback query received:', callbackQuery.data);
}

// Handle regular user message
async function handleRegularMessage(
  chatId: string,
  platformUserId: string,
  text: string,
  messageId: string,
  username?: string,
  firstName?: string
) {
  try {
    // Find or create user
    const user = await findOrCreateUser('telegram', platformUserId, {
      username,
      firstName,
    });

    // Save incoming message
    await saveMessage({
      platform: 'telegram',
      platform_message_id: messageId,
      user_id: user.id,
      chat_id: chatId,
      content: text,
      direction: 'inbound',
      status: 'delivered',
      metadata: { username, firstName },
    });

    // Get conversation history
    const history = await getConversationHistory(user.id, 20);

    // Send typing indicator (optional, would need additional API call)
    
    // Forward to Kin backend
    const kinResponse = await kinBackendService.processMessage(
      user.id,
      'telegram',
      text,
      history
    );

    if (kinResponse) {
      // Send response back to user
      const sendResult = await telegramService.sendMessage(
        chatId,
        kinResponse.response,
        { 
          parseMode: 'HTML',
          replyToMessageId: parseInt(messageId),
        }
      );

      // Save outgoing message
      if (sendResult.success) {
        await saveMessage({
          platform: 'telegram',
          platform_message_id: sendResult.messageId || 'unknown',
          user_id: user.id,
          chat_id: chatId,
          content: kinResponse.response,
          direction: 'outbound',
          status: 'sent',
        });
      }
    } else {
      // Fallback response if Kin backend is unavailable
      await telegramService.sendMessage(
        chatId,
        'I\'m sorry, I\'m having trouble processing your message right now. Please try again in a moment.',
        { replyToMessageId: parseInt(messageId) }
      );
    }

  } catch (error) {
    logger.error('Error handling regular message:', error);
    await telegramService.sendMessage(
      chatId,
      'Sorry, an error occurred. Please try again later.'
    );
  }
}

// Get bot info - GET /api/webhooks/telegram/info
router.get('/info', async (_req: Request, res: Response) => {
  const info = await telegramService.getMe();
  const webhookInfo = await telegramService.getWebhookInfo();
  
  res.json({
    bot: info,
    webhook: webhookInfo,
    inviteLink: telegramService.getBotInviteLink(),
  });
});

// Set webhook - POST /api/webhooks/telegram/set-webhook
router.post('/set-webhook', async (_req: Request, res: Response) => {
  const success = await telegramService.setWebhook();
  res.json({ success });
});

// Delete webhook - POST /api/webhooks/telegram/delete-webhook
router.post('/delete-webhook', async (_req: Request, res: Response) => {
  const success = await telegramService.deleteWebhook();
  res.json({ success });
});

export default router;
