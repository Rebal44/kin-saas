export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone_number: string | null
          stripe_customer_id: string | null
          subscription_status: string
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bot_connections: {
        Row: {
          id: string
          user_id: string
          platform: string
          platform_user_id: string
          platform_username: string | null
          is_active: boolean
          connected_at: string
          last_activity_at: string
          qr_code_url: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          platform_user_id: string
          platform_username?: string | null
          is_active?: boolean
          connected_at?: string
          last_activity_at?: string
          qr_code_url?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          platform_user_id?: string
          platform_username?: string | null
          is_active?: boolean
          connected_at?: string
          last_activity_at?: string
          qr_code_url?: string | null
          metadata?: Json
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          bot_connection_id: string | null
          platform: string
          message: string
          response: string | null
          message_type: string
          tokens_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bot_connection_id?: string | null
          platform: string
          message: string
          response?: string | null
          message_type?: string
          tokens_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bot_connection_id?: string | null
          platform?: string
          message?: string
          response?: string | null
          message_type?: string
          tokens_used?: number
          created_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          source: string
          event_type: string
          payload: Json
          processed: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source: string
          event_type: string
          payload: Json
          processed?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source?: string
          event_type?: string
          payload?: Json
          processed?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      get_user_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_messages: number
          messages_this_month: number
          subscription_status: string
          subscription_ends_at: string
          days_remaining: number
        }
      }
      track_usage: {
        Args: {
          p_user_id: string
          p_action: string
          p_metadata?: Json
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
