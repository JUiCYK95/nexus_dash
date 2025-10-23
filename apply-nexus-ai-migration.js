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
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('Applying Nexus AI chat history migration...')

    // Read the SQL file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20240126000000_create_nexus_ai_chat_history.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Split SQL statements by semicolon (simple approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
      console.log(statement.substring(0, 100) + '...')

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        // Check if error is just about existing objects
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist')) {
          console.log('  ⚠️  Object already exists or doesn\'t exist, continuing...')
        } else {
          console.error('  ❌ Error:', error.message)
          // Don't exit, continue with next statement
        }
      } else {
        console.log('  ✅ Success')
      }
    }

    console.log('\n✅ Migration completed!')
    console.log('\nVerifying table creation...')

    // Try to query the table to verify it exists
    const { data, error } = await supabase
      .from('nexus_ai_chat_history')
      .select('count')
      .limit(0)

    if (error) {
      console.error('❌ Table verification failed:', error.message)
      console.log('\nPlease run the SQL manually in Supabase Dashboard:')
      console.log('1. Go to https://supabase.com/dashboard/project/ijbrtnxhtojmnfavhrpx/sql')
      console.log('2. Copy the contents of: supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql')
      console.log('3. Paste and run it')
    } else {
      console.log('✅ Table exists and is accessible!')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\nPlease run the SQL manually in Supabase Dashboard:')
    console.log('1. Go to https://supabase.com/dashboard/project/ijbrtnxhtojmnfavhrpx/sql')
    console.log('2. Copy the contents of: supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql')
    console.log('3. Paste and run it')
    process.exit(1)
  }
}

applyMigration()
