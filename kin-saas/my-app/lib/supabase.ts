import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          stripe_customer_id: string | null
          subscription_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          created_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          user_id: string
          type: 'whatsapp' | 'telegram'
          status: 'pending' | 'connected' | 'disconnected'
          phone_number: string | null
          bot_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'whatsapp' | 'telegram'
          status?: 'pending' | 'connected' | 'disconnected'
          phone_number?: string | null
          bot_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'whatsapp' | 'telegram'
          status?: 'pending' | 'connected' | 'disconnected'
          phone_number?: string | null
          bot_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
