import { DatabaseError, NotFoundError } from '../middleware/errorHandler.js';

export async function listEntries(supabase, userId, { from, to } = {}) {
  let query = supabase
    .from('journal_entries')
    .select('id, entry_date, content, created_at, updated_at')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (from) query = query.gte('entry_date', from);
  if (to) query = query.lte('entry_date', to);

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message);

  return data;
}

export async function getEntry(supabase, userId, entryDate) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, entry_date, content, created_at, updated_at')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${entryDate}`);

  return data;
}

export async function upsertEntry(supabase, userId, entryDate, content) {
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(
      { user_id: userId, entry_date: entryDate, content },
      { onConflict: 'user_id,entry_date' },
    )
    .select('id, entry_date, content, created_at, updated_at')
    .single();

  if (error) throw new DatabaseError(error.message);

  return data;
}

export async function updateEntry(supabase, userId, entryDate, content) {
  const { data, error } = await supabase
    .from('journal_entries')
    .update({ content })
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .select('id, entry_date, content, created_at, updated_at')
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${entryDate}`);

  return data;
}

export async function deleteEntry(supabase, userId, entryDate) {
  const { data, error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .select('id')
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`No entry found for ${entryDate}`);
}
