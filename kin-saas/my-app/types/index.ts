export interface User {
  id: string
  email: string
  stripe_customer_id: string | null
  subscription_status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | null
  created_at: string
}

export interface Connection {
  id: string
  user_id: string
  type: 'whatsapp' | 'telegram'
  status: 'pending' | 'connected' | 'disconnected'
  phone_number: string | null
  bot_token: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
}
