import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Utility function to create user profile
export async function createUserProfile(userId: string, email: string, fullName?: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        id: userId,
        email: email,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    throw error
  }

  return data
}

// Utility function to get user analytics
export async function getUserAnalytics(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('message_analytics')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error fetching user analytics:', error)
    throw error
  }

  return data
}