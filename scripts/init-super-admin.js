const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function initSuperAdmin() {
  console.log('\n🔐 Super Admin Initialisierung\n');
  console.log('Dieses Skript gewährt einem Benutzer Super Admin Rechte.\n');

  const email = await question('E-Mail-Adresse des Benutzers: ');

  if (!email || !email.includes('@')) {
    console.error('❌ Ungültige E-Mail-Adresse');
    rl.close();
    process.exit(1);
  }

  try {
    // Find user by email
    console.log(`\n🔍 Suche Benutzer mit E-Mail: ${email}...`);

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      throw new Error(`Fehler beim Abrufen der Benutzer: ${userError.message}`);
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ Kein Benutzer mit E-Mail ${email} gefunden`);
      rl.close();
      process.exit(1);
    }

    console.log(`✅ Benutzer gefunden: ${user.email} (ID: ${user.id})`);

    // Check if already super admin
    const { data: existing, error: checkError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ Fehler beim Überprüfen: ${checkError.message}`);
      rl.close();
      process.exit(1);
    }

    if (existing && existing.is_active) {
      console.log('ℹ️  Dieser Benutzer ist bereits ein aktiver Super Admin');
      rl.close();
      process.exit(0);
    }

    if (existing && !existing.is_active) {
      // Reactivate
      const { error: updateError } = await supabase
        .from('super_admins')
        .update({ is_active: true })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Fehler beim Reaktivieren: ${updateError.message}`);
      }

      console.log('✅ Super Admin erfolgreich reaktiviert!');
    } else {
      // Create new super admin
      const { error: insertError } = await supabase
        .from('super_admins')
        .insert({
          user_id: user.id,
          granted_by: null,
          notes: 'Initialized via script'
        });

      if (insertError) {
        throw new Error(`Fehler beim Erstellen: ${insertError.message}`);
      }

      console.log('✅ Super Admin erfolgreich erstellt!');
    }

    console.log('\n📋 Zusammenfassung:');
    console.log(`   E-Mail: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Status: Super Admin ✓`);
    console.log('\n🎉 Der Benutzer kann jetzt auf /super-admin zugreifen!\n');

  } catch (error) {
    console.error(`\n❌ Fehler: ${error.message}\n`);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

// Run script
initSuperAdmin();
