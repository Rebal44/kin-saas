import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// WhatsApp webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified')
    return new NextResponse(challenge)
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// WhatsApp webhook events
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Process WhatsApp messages
    if (body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              await handleWhatsAppMessage(message)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function handleWhatsAppMessage(message: any) {
  const from = message.from
  const messageType = message.type
  
  console.log(`Received ${messageType} message from ${from}`)

  // Handle different message types
  switch (messageType) {
    case 'text':
      const text = message.text.body
      console.log('Text message:', text)
      
      // Check if this is a connection request
      if (text.startsWith('CONNECT:')) {
        const userId = text.replace('CONNECT:', '').trim()
        await connectWhatsAppUser(userId, from)
      } else {
        // Process regular message through AI
        await processAIMessage(userId, text, 'whatsapp', from)
      }
      break
      
    case 'audio':
      console.log('Audio message received')
      // Handle voice message
      break
      
    case 'image':
      console.log('Image message received')
      // Handle image
      break
      
    default:
      console.log('Unhandled message type:', messageType)
  }
}

async function connectWhatsAppUser(userId: string, phoneNumber: string) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase
      .from('connections')
      .upsert({
        user_id: userId,
        type: 'whatsapp',
        phone_number: phoneNumber,
        status: 'connected',
      })

    if (error) throw error

    console.log(`Connected WhatsApp for user ${userId}`)
    
    // Send welcome message
    await sendWhatsAppMessage(phoneNumber, 'Welcome to Kin! 👋 I\'m now connected and ready to help you.')
  } catch (error) {
    console.error('Error connecting WhatsApp user:', error)
  }
}

async function processAIMessage(userId: string, text: string, platform: string, from: string) {
  // TODO: Integrate with your AI backend
  console.log(`Processing AI message for ${userId}: ${text}`)
  
  // Placeholder response
  const response = "Hello! I'm Kin, your AI assistant. I'm here to help you with anything you need."
  
  if (platform === 'whatsapp') {
    await sendWhatsAppMessage(from, response)
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: message },
      }),
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`)
    }

    console.log('WhatsApp message sent successfully')
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
  }
}
