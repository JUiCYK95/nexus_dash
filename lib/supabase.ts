import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for browser/client components)
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          full_name: string | null
          avatar_url: string | null
          whatsapp_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          full_name?: string | null
          avatar_url?: string | null
          whatsapp_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          full_name?: string | null
          avatar_url?: string | null
          whatsapp_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_contacts: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          name: string | null
          phone_number: string | null
          profile_picture_url: string | null
          is_blocked: boolean
          last_seen: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          name?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          is_blocked?: boolean
          last_seen?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          name?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          is_blocked?: boolean
          last_seen?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_messages: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          message_id: string
          content: string | null
          message_type: string
          is_outgoing: boolean
          is_read: boolean
          timestamp: string
          media_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          message_id: string
          content?: string | null
          message_type?: string
          is_outgoing?: boolean
          is_read?: boolean
          timestamp: string
          media_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          message_id?: string
          content?: string | null
          message_type?: string
          is_outgoing?: boolean
          is_read?: boolean
          timestamp?: string
          media_url?: string | null
          created_at?: string
        }
      }
      message_analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          total_messages: number
          messages_sent: number
          messages_received: number
          unique_contacts: number
          response_rate: number
          avg_response_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_messages?: number
          messages_sent?: number
          messages_received?: number
          unique_contacts?: number
          response_rate?: number
          avg_response_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_messages?: number
          messages_sent?: number
          messages_received?: number
          unique_contacts?: number
          response_rate?: number
          avg_response_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}