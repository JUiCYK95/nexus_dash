import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create the table
    const createTableQuery = `
      -- Create table for Nexus AI chat history
      CREATE TABLE IF NOT EXISTS public.nexus_ai_chat_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index on user_id for faster queries
      CREATE INDEX IF NOT EXISTS idx_nexus_ai_chat_history_user_id ON public.nexus_ai_chat_history(user_id);

      -- Create index on created_at for sorting
      CREATE INDEX IF NOT EXISTS idx_nexus_ai_chat_history_created_at ON public.nexus_ai_chat_history(created_at);
    `

    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableQuery })

    // Enable RLS
    const rlsQuery = `
      -- Enable RLS
      ALTER TABLE public.nexus_ai_chat_history ENABLE ROW LEVEL SECURITY;
    `
    await supabaseAdmin.rpc('exec_sql', { sql: rlsQuery })

    // Create policies
    const policiesQuery = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own chat history" ON public.nexus_ai_chat_history;
      DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.nexus_ai_chat_history;
      DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.nexus_ai_chat_history;

      -- Create policy: Users can only read their own chat history
      CREATE POLICY "Users can view their own chat history"
        ON public.nexus_ai_chat_history
        FOR SELECT
        USING (auth.uid() = user_id);

      -- Create policy: Users can only insert their own chat messages
      CREATE POLICY "Users can insert their own chat messages"
        ON public.nexus_ai_chat_history
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      -- Create policy: Users can only delete their own chat history
      CREATE POLICY "Users can delete their own chat history"
        ON public.nexus_ai_chat_history
        FOR DELETE
        USING (auth.uid() = user_id);
    `
    await supabaseAdmin.rpc('exec_sql', { sql: policiesQuery })

    return NextResponse.json({
      success: true,
      message: 'Nexus AI chat history table created successfully'
    })

  } catch (error: any) {
    console.error('Error setting up Nexus AI chat history:', error)
    return NextResponse.json({
      error: error.message || 'Failed to setup chat history table'
    }, { status: 500 })
  }
}
