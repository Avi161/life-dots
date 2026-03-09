import { supabaseAdmin } from '../lib/supabase.js';
import { AuthenticationError, DatabaseError } from '../middleware/errorHandler.js';

export async function getGoogleOAuthUrl(redirectTo) {
  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) throw new DatabaseError(error.message);

  return data.url;
}

export async function exchangeCodeForSession(code) {
  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

  if (error) {
    throw new AuthenticationError('Failed to exchange auth code for session');
  }

  return data;
}

export async function getUserProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, birth_date, expected_lifespan, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);

  return data;
}
