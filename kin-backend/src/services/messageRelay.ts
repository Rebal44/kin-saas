import { logger } from '../utils';
import { kinAiRelayService } from './kinAi';
import { whatsAppService } from './whatsapp';
import { telegramService } from './telegram';
import { debitCredits } from './credits';
import { syncSubscriptionStatusForUser } from './subscriptionSync';
import {
  saveIncomingMessage,
  saveOutgoingMessage,
  updateOutgoingMessageStatus,
  getBotConnectionByPlatformAndIdentifier,
  createBotConnection,
  getOrCreateConversation,
  addConversationMessage,
  getConversationHistory,
  markConnectionAsConnected,
  getUserById,
} from '../db';
import {
  Platform,
  WhatsAppMessage,
  TelegramMessage,
  IncomingMessage,
  BotConnection,
} from '../types';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://your-domain.com';

export class MessageRelayService {
  // Process incoming WhatsApp message
  async processWhatsAppMessage(
    message: WhatsAppMessage,
    phoneNumberId: string
  ): Promise<void> {
    const from = message.from;
    const messageId = message.id;

    logger.info(`Processing WhatsApp message from ${from}`);

    try {
      // Find or create bot connection
      let connection = await getBotConnectionByPlatformAndIdentifier('whatsapp', from);

      if (!connection) {
        logger.warn(`No connection found for WhatsApp number ${from}`);
        // Create a pending connection
        connection = await createBotConnection({
          platform: 'whatsapp',
          phone_number: from,
          is_connected: false,
          user_id: 'pending', // Will be updated when user verifies
        });

        if (!connection) {
          logger.error('Failed to create pending connection');
          return;
        }

        // Send welcome message asking to connect via dashboard
        await whatsAppService.sendTextMessage(
          from,
          `Welcome!\n\nTo start using this, connect your account on:\n${FRONTEND_URL}\n\n(You’ll subscribe first, then connect WhatsApp/Telegram from there.)`
        );
        return;
      }

      // If not connected, ignore or send connection prompt
      if (!connection.is_connected) {
        await whatsAppService.sendTextMessage(
          from,
          `Please finish connecting your account from ${FRONTEND_URL} to start chatting.`
        );
        return;
      }

      // Extract message content
      let content = '';
      let messageType: IncomingMessage['message_type'] = 'text';
      let mediaUrl: string | undefined;

      switch (message.type) {
        case 'text':
          content = message.text?.body || '';
          messageType = 'text';
          break;
        case 'image':
          content = message.image?.caption || '[Image]';
          messageType = 'image';
          // Note: Media download would happen here in production
          break;
        case 'audio':
          content = '[Audio message]';
          messageType = 'audio';
          break;
        case 'video':
          content = message.video?.caption || '[Video]';
          messageType = 'video';
          break;
        case 'document':
          content = message.document?.caption || `[Document: ${message.document?.filename}]`;
          messageType = 'document';
          break;
        case 'location':
          content = `Location: ${message.location?.latitude}, ${message.location?.longitude}`;
          if (message.location?.name) {
            content += ` (${message.location.name})`;
          }
          messageType = 'location';
          break;
        default:
          content = '[Unknown message type]';
      }

      // Save incoming message
      const savedMessage = await saveIncomingMessage({
        connection_id: connection.id,
        platform: 'whatsapp',
        external_id: messageId,
        from_user: from,
        message_type: messageType,
        content,
        media_url: mediaUrl,
        metadata: { raw_message: message },
      });

      if (!savedMessage) {
        logger.error('Failed to save incoming message');
        return;
      }

      // Get or create conversation
      const conversation = await getOrCreateConversation(
        connection.user_id,
        connection.id,
        'whatsapp'
      );

      if (!conversation) {
        logger.error('Failed to get or create conversation');
        return;
      }

      // Add to conversation history
      await addConversationMessage({
        conversation_id: conversation.id,
        role: 'user',
        content,
        message_type: messageType,
        incoming_message_id: savedMessage.id,
      });

      // Relay to Kimi (Kin AI)
      const response = await kinAiRelayService.sendMessage({
        message: content,
        user_id: connection.user_id,
        conversation_id: conversation.id,
        platform: 'whatsapp',
        history: [],
        metadata: {
          original_message_type: messageType,
          phone_number: from,
        },
      });

      // Send response back to user
      await this.sendWhatsAppResponse(connection, from, response.message);

      // Add assistant response to conversation
      await addConversationMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: response.message,
        message_type: 'text',
      });

    } catch (error) {
      logger.error('Error processing WhatsApp message:', error);
    }
  }

  // Process incoming Telegram message
  async processTelegramMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id.toString();
    const from = message.from;

    logger.info(`Processing Telegram message from ${from.username || from.id}`);

    try {
      // Check for /start command with connection token
      const startCommand = telegramService.isStartCommand(message);
      if (startCommand.isCommand && startCommand.param) {
        await this.handleTelegramConnection(chatId, startCommand.param, from.username);
        return;
      }

      // Find bot connection
      let connection = await getBotConnectionByPlatformAndIdentifier('telegram', chatId);

      if (!connection) {
        logger.warn(`No connection found for Telegram chat ${chatId}`);
        await telegramService.sendTextMessage(
          chatId,
          `Welcome!\n\nTo start using this, subscribe + connect Telegram here:\n${FRONTEND_URL}\n\nAfter that, come back and message me again.`
        );
        return;
      }

      if (!connection.is_connected) {
        await telegramService.sendTextMessage(
          chatId,
          'Please finish connecting your account from the website first (you need to subscribe, then click “Connect Telegram”).'
        );
        return;
      }

      // Subscription gate
      const user = await getUserById(connection.user_id);
      const allowedStatuses = new Set(['active', 'trialing']);
      if (!user) {
        await telegramService.sendTextMessage(
          chatId,
          'Your account isn’t ready yet. Please subscribe on the website, then try again.'
        );
        return;
      }

      let subscriptionStatus = user.subscription_status;

      if (!allowedStatuses.has(subscriptionStatus)) {
        // Best-effort: Stripe webhooks can arrive a bit later; try a quick sync once.
        subscriptionStatus = await syncSubscriptionStatusForUser(connection.user_id);
        if (!allowedStatuses.has(subscriptionStatus)) {
          await telegramService.sendTextMessage(
            chatId,
            'Your subscription is not active yet. If you just paid, wait ~30 seconds and try again.'
          );
          return;
        }
      }

      // Credits gate (simple: 1 credit per inbound message)
      const creditsPerMessage = Number(process.env.CREDITS_PER_MESSAGE || 1);
      const debit = await debitCredits({
        userId: connection.user_id,
        amount: creditsPerMessage,
        reason: 'telegram_message',
        reference: `telegram:inbound:${chatId}:${message.message_id}`,
        metadata: { platform: 'telegram', chatId, messageId: message.message_id },
      });

      if (!debit.ok) {
        await telegramService.sendTextMessage(
          chatId,
          `You’re out of credits. Top up here: ${FRONTEND_URL}/top-up`
        );
        return;
      }

      // Extract message content
      let content = '';
      let messageType: IncomingMessage['message_type'] = 'text';

      if (message.text) {
        content = message.text;
        messageType = 'text';
      } else if (message.photo) {
        content = message.caption || '[Image]';
        messageType = 'image';
      } else if (message.voice) {
        content = '[Voice message]';
        messageType = 'audio';
      } else if (message.document) {
        content = message.caption || `[Document: ${message.document.file_name}]`;
        messageType = 'document';
      } else {
        content = '[Unknown message type]';
      }

      // Save incoming message
      const savedMessage = await saveIncomingMessage({
        connection_id: connection.id,
        platform: 'telegram',
        external_id: message.message_id.toString(),
        from_user: from.id.toString(),
        message_type: messageType,
        content,
        metadata: { raw_message: message },
      });

      if (!savedMessage) {
        logger.error('Failed to save incoming message');
        return;
      }

      // Get or create conversation
      const conversation = await getOrCreateConversation(
        connection.user_id,
        connection.id,
        'telegram'
      );

      if (!conversation) {
        logger.error('Failed to get or create conversation');
        return;
      }

      // Add to conversation history
      await addConversationMessage({
        conversation_id: conversation.id,
        role: 'user',
        content,
        message_type: messageType,
        incoming_message_id: savedMessage.id,
      });

      // Get conversation history for context
      const history = await getConversationHistory(conversation.id, 10);

      // Relay to Kin AI backend
      const response = await kinAiRelayService.sendMessage({
        message: content,
        user_id: connection.user_id,
        conversation_id: conversation.id,
        platform: 'telegram',
        history: history.map((h) => ({ role: h.role, content: h.content })),
        metadata: {
          original_message_type: messageType,
          chat_id: chatId,
          username: from.username,
        },
      });

      // Send response back to user
      await this.sendTelegramResponse(connection, parseInt(chatId), response.message);

      // Add assistant response to conversation
      await addConversationMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: response.message,
        message_type: 'text',
      });

    } catch (error) {
      logger.error('Error processing Telegram message:', error);
    }
  }

  // Handle Telegram connection via /start command
  private async handleTelegramConnection(chatId: string, token: string, username?: string): Promise<void> {
    logger.info(`Processing Telegram connection for chat ${chatId} with token ${token}`);

    const connection = await getBotConnectionById(token);

    if (!connection) {
      await telegramService.sendTextMessage(
        chatId,
        'That connect link is invalid or expired. Please generate a new Telegram connect link from the website and try again.'
      );
      return;
    }

    if (connection.platform !== 'telegram') {
      await telegramService.sendTextMessage(
        chatId,
        'That connect link is for a different platform. Please generate a Telegram connect link and try again.'
      );
      return;
    }

    // Mark as connected and bind this chat_id to the connection token
    const updated = await updateBotConnection(connection.id, {
      is_connected: true,
      connected_at: new Date().toISOString(),
      chat_id: chatId,
      username: username || connection.username,
      platform_user_id: chatId,
    } as any);

    if (!updated) {
      await telegramService.sendTextMessage(
        chatId,
        'I couldn’t complete the connection due to a server error. Please try again in a minute.'
      );
      return;
    }

    await telegramService.sendTextMessage(
      chatId,
      '✅ Connected successfully!\n\nYou’re all set. Send me a message any time.'
    );
  }

  // Send WhatsApp response
  private async sendWhatsAppResponse(
    connection: BotConnection,
    to: string,
    message: string
  ): Promise<void> {
    // Save outgoing message
    const savedOutgoing = await saveOutgoingMessage({
      connection_id: connection.id,
      platform: 'whatsapp',
      to_user: to,
      message_type: 'text',
      content: message,
      status: 'pending',
    });

    if (!savedOutgoing) {
      logger.error('Failed to save outgoing message');
      return;
    }

    // Send via WhatsApp API
    const success = await whatsAppService.sendTextMessage(to, message);

    // Update status
    await updateOutgoingMessageStatus(
      savedOutgoing.id,
      success ? 'sent' : 'failed',
      success ? undefined : 'Failed to send message'
    );
  }

  // Send Telegram response
  private async sendTelegramResponse(
    connection: BotConnection,
    chatId: number,
    message: string
  ): Promise<void> {
    // Save outgoing message
    const savedOutgoing = await saveOutgoingMessage({
      connection_id: connection.id,
      platform: 'telegram',
      to_user: chatId.toString(),
      message_type: 'text',
      content: message,
      status: 'pending',
    });

    if (!savedOutgoing) {
      logger.error('Failed to save outgoing message');
      return;
    }

    // Send via Telegram API
    const success = await telegramService.sendTextMessage(chatId, message);

    // Update status
    await updateOutgoingMessageStatus(
      savedOutgoing.id,
      success ? 'sent' : 'failed',
      success ? undefined : 'Failed to send message'
    );
  }

  // Handle connection completion for a user
  async completeConnection(
    userId: string,
    platform: Platform,
    identifier: string
  ): Promise<BotConnection | null> {
    // Find existing pending connection or create new one
    let connection = await getBotConnectionByPlatformAndIdentifier(platform, identifier);

    if (connection) {
      // Update existing connection
      connection = await markConnectionAsConnected(connection.id, identifier);
    } else {
      // Create new connection
      connection = await createBotConnection({
        user_id: userId,
        platform,
        ...(platform === 'whatsapp'
          ? { phone_number: identifier }
          : { chat_id: identifier }),
        is_connected: true,
        connected_at: new Date().toISOString(),
      });
    }

    // Send welcome message
    if (connection) {
      const welcomeMessage =
        '👋 Welcome to Kin!\n\n' +
        'I\'m your personal AI assistant, here to help you with:\n\n' +
        '• Answering questions\n' +
        '• Summarizing information\n' +
        '• Setting reminders\n' +
        '• And much more!\n\n' +
        'Just send me a message and I\'ll do my best to help.';

      if (platform === 'whatsapp' && connection.phone_number) {
        await whatsAppService.sendTextMessage(connection.phone_number, welcomeMessage);
      } else if (platform === 'telegram' && connection.chat_id) {
        await telegramService.sendTextMessage(connection.chat_id, welcomeMessage);
      }
    }

    return connection;
  }
}

export const messageRelayService = new MessageRelayService();
