const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public'
  }
})

async function applyMigration() {
  try {
    console.log('✅ Applying Nexus AI chat history migration...')
    console.log('\nThe migration SQL file is ready at:')
    console.log('  supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql')

    console.log('\n📋 To apply this migration, please:')
    console.log('1. Go to: https://supabase.com/dashboard/project/ijbrtnxhtojmnfavhrpx/sql')
    console.log('2. Open the migration file and copy all its contents')
    console.log('3. Paste it into the SQL editor in Supabase Dashboard')
    console.log('4. Click "Run" to execute the migration')

    console.log('\n💡 Alternatively, the application will work without manual migration.')
    console.log('   The database operations will handle errors gracefully.')
    console.log('   However, for best performance and to store chat history, apply the migration.')

    // Try to check if table exists
    console.log('\n🔍 Checking if table already exists...')
    const { data, error } = await supabase
      .from('nexus_ai_chat_history')
      .select('count')
      .limit(0)

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet - migration needed')
      } else {
        console.log('⚠️  Error checking table:', error.message)
      }
    } else {
      console.log('✅ Table already exists! Migration not needed.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyMigration()
