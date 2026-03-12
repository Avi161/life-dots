import { DatabaseError } from '../middleware/errorHandler.js';

const SETTINGS_COLUMNS = 'birth_date, expected_lifespan, theme, heartbeat_enabled, dot_meta';

export async function getSettings(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(SETTINGS_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);

  return data;
}

export async function ensureProfile(supabaseAdmin, userId, email) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, username: email }, { onConflict: 'id' });

  if (error) throw new DatabaseError(error.message);
}

export async function updateSettings(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select(SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new Error('Profile not found. Please log in again.');

  return data;
}
