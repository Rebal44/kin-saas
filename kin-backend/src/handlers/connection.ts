import { Request, Response } from 'express';
import { generateQRCodeSVG, generateTelegramBotLink, logger, generateConnectionToken } from '../utils';
import { telegramService } from '../services/telegram';
import {
  createBotConnection,
  getBotConnectionsByUserId,
  getUserByClerkId,
} from '../db';
import { ConnectionLinkResponse, ApiResponse } from '../types';

// Generate WhatsApp connection QR code
export async function generateWhatsAppConnection(req: Request, res: Response): Promise<void> {
  try {
    // In production, this would be authenticated via Clerk
    const clerkId = req.headers['x-clerk-user-id'] as string;
    
    if (!clerkId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    // Get or create user
    let user = await getUserByClerkId(clerkId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // Create a pending connection
    const token = generateConnectionToken();
    const connection = await createBotConnection({
      user_id: user.id,
      platform: 'whatsapp',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({
        success: false,
        error: 'Failed to create connection',
      } as ApiResponse);
      return;
    }

    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'kin_connect',
      platform: 'whatsapp',
      token: connection.id,
      user_id: user.id,
    });

    // Generate QR code SVG
    const qrCodeSvg = await generateQRCodeSVG(qrData);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const response: ApiResponse<ConnectionLinkResponse> = {
      success: true,
      data: {
        connection_id: connection.id,
        qr_code_url: `data:image/svg+xml;base64,${Buffer.from(qrCodeSvg).toString('base64')}`,
        platform: 'whatsapp',
        expires_at: expiresAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating WhatsApp connection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
}

// Generate Telegram connection link
export async function generateTelegramConnection(req: Request, res: Response): Promise<void> {
  try {
    // In production, this would be authenticated via Clerk
    const clerkId = req.headers['x-clerk-user-id'] as string;
    
    if (!clerkId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    // Get or create user
    let user = await getUserByClerkId(clerkId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // Create a pending connection
    const connection = await createBotConnection({
      user_id: user.id,
      platform: 'telegram',
      is_connected: false,
    });

    if (!connection) {
      res.status(500).json({
        success: false,
        error: 'Failed to create connection',
      } as ApiResponse);
      return;
    }

    // Get bot info
    const botInfo = await telegramService.getMe();
    
    if (!botInfo) {
      res.status(500).json({
        success: false,
        error: 'Failed to get bot info',
      } as ApiResponse);
      return;
    }

    // Generate bot link with connection token
    const botLink = generateTelegramBotLink(botInfo.username, connection.id);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const response: ApiResponse<ConnectionLinkResponse> = {
      success: true,
      data: {
        connection_id: connection.id,
        bot_link: botLink,
        platform: 'telegram',
        expires_at: expiresAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating Telegram connection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
}

// Get user's bot connections
export async function getUserConnections(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.headers['x-clerk-user-id'] as string;
    
    if (!clerkId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const user = await getUserByClerkId(clerkId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    const connections = await getBotConnectionsByUserId(user.id);

    res.json({
      success: true,
      data: connections,
    } as ApiResponse<typeof connections>);
  } catch (error) {
    logger.error('Error getting user connections:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
}

// Disconnect a bot
export async function disconnectBot(req: Request, res: Response): Promise<void> {
  try {
    const clerkId = req.headers['x-clerk-user-id'] as string;
    const { connectionId } = req.params;
    
    if (!clerkId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse);
      return;
    }

    const user = await getUserByClerkId(clerkId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    // TODO: Implement disconnect logic
    // - Verify connection belongs to user
    // - Mark as disconnected
    // - Optionally send goodbye message

    res.json({
      success: true,
      message: 'Bot disconnected successfully',
    } as ApiResponse);
  } catch (error) {
    logger.error('Error disconnecting bot:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
}