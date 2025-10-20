// Test script for team invitation
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijbrtnxhtojmnfavhrpx.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing invitation system...')
console.log('Supabase URL:', supabaseUrl)
console.log('Using service role key:', supabaseKey ? 'Yes' : 'No')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInvitation() {
  try {
    // Check if organization_invitations table exists
    console.log('\n1. Checking if organization_invitations table exists...')
    const { data: tables, error: tablesError } = await supabase
      .from('organization_invitations')
      .select('*')
      .limit(1)

    if (tablesError) {
      console.error('❌ Table does not exist or error:', tablesError)
      return
    }

    console.log('✅ Table exists!')

    // Get first organization
    console.log('\n2. Getting first organization...')
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single()

    if (orgError || !org) {
      console.error('❌ No organization found:', orgError)
      return
    }

    console.log('✅ Organization found:', org.name, org.id)

    // Get first member
    console.log('\n3. Getting first member...')
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', org.id)
      .limit(1)
      .single()

    if (memberError || !member) {
      console.error('❌ No member found:', memberError)
      return
    }

    console.log('✅ Member found:', member.user_id, 'Role:', member.role)

    // Test creating an invitation
    console.log('\n4. Creating test invitation...')
    const inviteToken = `test-${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: org.id,
        email: 'test@example.com',
        role: 'member',
        invited_by: member.user_id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      console.error('Full error:', JSON.stringify(inviteError, null, 2))
      return
    }

    console.log('✅ Invitation created successfully!')
    console.log('Invitation details:', invitation)

    // Clean up test invitation
    console.log('\n5. Cleaning up test invitation...')
    const { error: deleteError } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitation.id)

    if (deleteError) {
      console.error('❌ Error deleting test invitation:', deleteError)
    } else {
      console.log('✅ Test invitation deleted')
    }

    console.log('\n✅ All tests passed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testInvitation()
