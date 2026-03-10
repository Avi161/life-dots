import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
  if (userError || !users.length) {
    console.error('Failed to get a user ID to test with');
    process.exit(1);
  }
  const testUserId = users[0].id;

  console.log('Testing insert for user:', testUserId);

  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(
      { user_id: testUserId, context_key: "test_from_script", content: "<p>test</p>" },
      { onConflict: 'user_id,context_key' }
    )
    .select('*')
    .single();

  console.log("Upsert Error:", error);
  console.log("Upsert Data:", data);
}
check();
