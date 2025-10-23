import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch chat history for the user
    const { data: history, error: historyError } = await supabase
      .from('nexus_ai_chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching chat history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
    }

    // Transform database records to message format
    const messages = history.map(record => ({
      role: record.role as 'user' | 'assistant',
      content: record.content,
      timestamp: new Date(record.created_at),
    }))

    return NextResponse.json({
      success: true,
      messages: messages,
    })

  } catch (error: any) {
    console.error('Error in Nexus AI history:', error)
    return NextResponse.json({
      error: error.message || 'Ein Fehler ist aufgetreten'
    }, { status: 500 })
  }
}

// DELETE endpoint to clear chat history
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Delete all chat history for the user
    const { error: deleteError } = await supabase
      .from('nexus_ai_chat_history')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting chat history:', deleteError)
      return NextResponse.json({ error: 'Failed to delete chat history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Chat history cleared successfully',
    })

  } catch (error: any) {
    console.error('Error clearing chat history:', error)
    return NextResponse.json({
      error: error.message || 'Ein Fehler ist aufgetreten'
    }, { status: 500 })
  }
}
