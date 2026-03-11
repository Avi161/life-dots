import { DatabaseError, NotFoundError } from '../middleware/errorHandler.js';

export async function listTodos(supabase, userId) {
    const { data, error } = await supabase
        .from('todos')
        .select('id, context_key, task, is_completed, due_date, created_at, updated_at')
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw new DatabaseError(error.message);
    return data;
}

export async function getTodosByContext(supabase, userId, contextKey) {
    const { data, error } = await supabase
        .from('todos')
        .select('id, context_key, task, is_completed, due_date, created_at, updated_at')
        .eq('user_id', userId)
        .eq('context_key', contextKey)
        .order('created_at', { ascending: true });

    if (error) throw new DatabaseError(error.message);
    return data;
}

export async function createTodo(supabase, userId, contextKey, task, dueDate) {
    const { data, error } = await supabase
        .from('todos')
        .insert({ user_id: userId, context_key: contextKey, task, due_date: dueDate })
        .select('id, context_key, task, is_completed, due_date, created_at, updated_at')
        .single();

    if (error) throw new DatabaseError(error.message);
    return data;
}

export async function updateTodo(supabase, userId, id, updates) {
    const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('user_id', userId)
        .eq('id', id)
        .select('id, context_key, task, is_completed, due_date, created_at, updated_at')
        .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    if (!data) throw new NotFoundError(`No todo found with id ${id}`);
    return data;
}

export async function deleteTodo(supabase, userId, id) {
    const { data, error } = await supabase
        .from('todos')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
        .select('id')
        .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    if (!data) throw new NotFoundError(`No todo found with id ${id}`);
}
