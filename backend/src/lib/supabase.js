import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

const missing = [
  !supabaseUrl && 'SUPABASE_URL',
  !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  !anonKey && 'SUPABASE_ANON_KEY',
].filter(Boolean);

if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

/**
 * Admin client — bypasses RLS. Use only for auth operations
 * and administrative tasks that need full access.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Creates a Supabase client scoped to a specific user's JWT.
 * All queries through this client are subject to RLS policies.
 */
export function createUserClient(accessToken) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
