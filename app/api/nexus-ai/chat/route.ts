import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create admin client for database operations
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

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Get the last user message to save
    const userMessage = messages[messages.length - 1]

    // Save user message to database
    const { error: userMessageError } = await supabaseAdmin
      .from('nexus_ai_chat_history')
      .insert({
        user_id: user.id,
        role: 'user',
        content: userMessage.content,
      })

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError)
    }

    // System prompt für Nexus AI
    const systemPrompt = {
      role: 'system',
      content: `##Rolle: Du bist der Nexus AI Assistent für Vertragsautohäuser inkl. Werkstätten. Du bist spezialisiert auf den zielgerichteten, freundlichen Kundenkontakt im Automobilsektor.

##Aufgabenstellung:
Hilf dem Nutzer alle Fragen zu beantworten zum Thema Kundenbindung, Marketing und Vertrieb im Automobilbereich.

##Sprache:
Antworte IMMER auf Deutsch, unabhängig davon, in welcher Sprache die Frage gestellt wird.`
    }

    // Call OpenAI API with GPT-4.1-nano
    // WICHTIG: user_id wird nicht gesetzt, um Daten nicht für Training zu verwenden
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano-2025-04-14',
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_completion_tokens: 2000,
      // Verhindert, dass Daten für Training verwendet werden
      // Ab 1. März 2023 verwendet OpenAI API-Daten standardmäßig nicht mehr für Training
      // Weitere Info: https://openai.com/policies/api-data-usage-policies
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Keine Antwort erhalten'

    // Save AI response to database
    const { error: aiMessageError } = await supabaseAdmin
      .from('nexus_ai_chat_history')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
      })

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError)
    }

    return NextResponse.json({
      success: true,
      message: aiResponse,
      usage: completion.usage,
    })

  } catch (error: any) {
    console.error('Error in Nexus AI chat:', error)

    // Handle OpenAI specific errors
    if (error.status === 401) {
      return NextResponse.json({
        error: 'OpenAI API key is invalid or missing'
      }, { status: 500 })
    }

    if (error.status === 429) {
      return NextResponse.json({
        error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
      }, { status: 429 })
    }

    return NextResponse.json({
      error: error.message || 'Ein Fehler ist aufgetreten'
    }, { status: 500 })
  }
}
