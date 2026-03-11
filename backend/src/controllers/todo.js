import { z } from 'zod';
import * as todoService from '../services/todo.js';
import { ValidationError } from '../middleware/errorHandler.js';

const createSchema = z.object({
    context_key: z.string().min(1, 'context_key is required'),
    task: z.string().min(1, 'task cannot be empty'),
    due_date: z.string().optional().nullable(),
});

const updateSchema = z.object({
    task: z.string().optional(),
    is_completed: z.boolean().optional(),
    due_date: z.string().optional().nullable(),
});

export async function listAll(req, res, next) {
    try {
        const todos = await todoService.listTodos(req.supabase, req.user.id);
        res.json({ success: true, data: todos });
    } catch (err) {
        next(err);
    }
}

export async function getByContext(req, res, next) {
    try {
        const key = req.params.contextKey;
        const todos = await todoService.getTodosByContext(req.supabase, req.user.id, key);
        res.json({ success: true, data: todos });
    } catch (err) {
        next(err);
    }
}

export async function create(req, res, next) {
    try {
        const result = createSchema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues.map((i) => i.message).join('; ');
            throw new ValidationError(message);
        }

        const todo = await todoService.createTodo(
            req.supabase,
            req.user.id,
            result.data.context_key,
            result.data.task,
            result.data.due_date,
        );

        res.status(201).json({ success: true, data: todo });
    } catch (err) {
        next(err);
    }
}

export async function update(req, res, next) {
    try {
        const id = req.params.id;
        const result = updateSchema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues.map((i) => i.message).join('; ');
            throw new ValidationError(message);
        }

        const todo = await todoService.updateTodo(
            req.supabase,
            req.user.id,
            id,
            result.data,
        );

        res.json({ success: true, data: todo });
    } catch (err) {
        next(err);
    }
}

export async function remove(req, res, next) {
    try {
        const id = req.params.id;
        await todoService.deleteTodo(req.supabase, req.user.id, id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
}
