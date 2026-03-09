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

export async function updateSettings(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select(SETTINGS_COLUMNS)
    .single();

  if (error) throw new DatabaseError(error.message);

  return data;
}
