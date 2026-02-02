import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: connections, error } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ connections: connections || [] })
  } catch (error: any) {
    console.error('Error fetching connections:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, phone_number, bot_token } = body

    const { data: connection, error } = await supabase
      .from('connections')
      .upsert({
        user_id: user.id,
        type,
        phone_number,
        bot_token,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ connection })
  } catch (error: any) {
    console.error('Error creating connection:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
