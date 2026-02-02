import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Telegram webhook handler
export async function POST(request: Request) {
  try {
    const update = await request.json()
    
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2))

    // Handle different update types
    if (update.message) {
      await handleTelegramMessage(update.message)
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function handleTelegramMessage(message: any) {
  const chatId = message.chat.id
  const messageId = message.message_id
  const from = message.from
  
  console.log(`Received message from ${from.username || from.first_name} (chat: ${chatId})`)

  // Handle commands
  if (message.text) {
    const text = message.text
    
    if (text.startsWith('/start')) {
      await handleStartCommand(chatId, text)
    } else if (text.startsWith('/connect')) {
      await handleConnectCommand(chatId, text)
    } else if (text.startsWith('/help')) {
      await handleHelpCommand(chatId)
    } else {
      // Process regular message through AI
      await processTelegramMessage(chatId, text, from)
    }
  }

  // Handle voice messages
  if (message.voice) {
    await handleVoiceMessage(chatId, message.voice)
  }

  // Handle photos
  if (message.photo) {
    await handlePhotoMessage(chatId, message.photo)
  }
}

async function handleStartCommand(chatId: number, text: string) {
  const parts = text.split(' ')
  const userId = parts[1]

  if (userId) {
    // Connect user
    await connectTelegramUser(userId, chatId)
  } else {
    // Send welcome message
    const welcomeMessage = `
🤖 Welcome to Kin!

I'm your AI assistant, ready to help you via text or voice.

To get started, please connect your account:
1. Go to your Kin dashboard
2. Click "Connect Telegram"
3. Follow the link

Or use /connect [your-user-id]
    `.trim()

    await sendTelegramMessage(chatId, welcomeMessage)
  }
}

async function handleConnectCommand(chatId: number, text: string) {
  const parts = text.split(' ')
  const userId = parts[1]

  if (!userId) {
    await sendTelegramMessage(
      chatId,
      'Please provide your user ID. Use: /connect [your-user-id]'
    )
    return
  }

  await connectTelegramUser(userId, chatId)
}

async function handleHelpCommand(chatId: number) {
  const helpMessage = `
🤖 Kin Help

Available commands:
/start - Start the bot
/connect [user-id] - Connect your account
/help - Show this help message

You can also:
• Send text messages
• Send voice messages
• Share photos

I'll respond using AI to help with anything you need!
  `.trim()

  await sendTelegramMessage(chatId, helpMessage)
}

async function connectTelegramUser(userId: string, chatId: number) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase
      .from('connections')
      .upsert({
        user_id: userId,
        type: 'telegram',
        phone_number: chatId.toString(),
        status: 'connected',
      })

    if (error) throw error

    await sendTelegramMessage(
      chatId,
      '✅ Successfully connected! You can now chat with me anytime.'
    )
  } catch (error) {
    console.error('Error connecting Telegram user:', error)
    await sendTelegramMessage(
      chatId,
      '❌ Failed to connect. Please try again or contact support.'
    )
  }
}

async function processTelegramMessage(chatId: number, text: string, from: any) {
  // TODO: Integrate with your AI backend
  console.log(`Processing message from ${chatId}: ${text}`)
  
  // Show typing indicator
  await sendChatAction(chatId, 'typing')
  
  // Placeholder AI response
  const response = "Hello! I'm Kin, your AI assistant. I received your message and I'm here to help! 🚀"
  
  await sendTelegramMessage(chatId, response)
}

async function handleVoiceMessage(chatId: number, voice: any) {
  console.log('Voice message received:', voice.file_id)
  
  await sendChatAction(chatId, 'typing')
  
  // TODO: Process voice with speech-to-text and AI
  await sendTelegramMessage(
    chatId,
    "🎤 I received your voice message! Voice processing coming soon."
  )
}

async function handlePhotoMessage(chatId: number, photos: any[]) {
  console.log('Photo received:', photos[photos.length - 1].file_id)
  
  await sendChatAction(chatId, 'typing')
  
  // TODO: Process image with vision AI
  await sendTelegramMessage(
    chatId,
    "📸 I see your photo! Image analysis coming soon."
  )
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id
  const data = callbackQuery.data

  console.log('Callback query:', data)

  // Answer callback query to remove loading state
  await answerCallbackQuery(callbackQuery.id)

  // Handle different callback actions
  switch (data) {
    case 'help':
      await handleHelpCommand(chatId)
      break
    default:
      await sendTelegramMessage(chatId, 'Action received!')
  }
}

async function sendTelegramMessage(chatId: number, text: string, options: any = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
      }),
    })

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`)
    }

    console.log('Telegram message sent successfully')
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

async function sendChatAction(chatId: number, action: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    })
  } catch (error) {
    console.error('Error sending chat action:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
      }),
    })
  } catch (error) {
    console.error('Error answering callback query:', error)
  }
}
