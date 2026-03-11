import { DatabaseError, NotFoundError } from '../middleware/errorHandler.js';

export async function listEntries(supabase, userId) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, context_key, content, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new DatabaseError(error.message);

  return data;
}

export async function getEntry(supabase, userId, contextKey) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, context_key, content, created_at, updated_at')
    .eq('user_id', userId)
    .eq('context_key', contextKey)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${contextKey}`);

  return data;
}

export async function upsertEntry(supabase, userId, contextKey, content) {
  // Manual upsert to avoid requiring a UNIQUE constraint
  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('context_key', contextKey)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, context_key, content, created_at, updated_at')
      .single();
    if (error) throw new DatabaseError(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ user_id: userId, context_key: contextKey, content })
      .select('id, context_key, content, created_at, updated_at')
      .single();
    if (error) throw new DatabaseError(error.message);
    return data;
  }
}

export async function updateEntry(supabase, userId, contextKey, content) {
  const { data, error } = await supabase
    .from('journal_entries')
    .update({ content })
    .eq('user_id', userId)
    .eq('context_key', contextKey)
    .select('id, context_key, content, created_at, updated_at')
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${contextKey}`);

  return data;
}

export async function deleteEntry(supabase, userId, contextKey) {
  const { data, error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('context_key', contextKey)
    .select('id')
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${contextKey}`);
}
