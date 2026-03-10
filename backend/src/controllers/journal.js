import { z } from 'zod';
import * as journalService from '../services/journal.js';
import { ValidationError } from '../middleware/errorHandler.js';

const createSchema = z.object({
  context_key: z.string().min(1, 'context_key is required'),
  content: z.string().min(1, 'content cannot be empty'),
});

const updateSchema = z.object({
  content: z.string().min(1, 'content cannot be empty'),
});

export async function list(req, res, next) {
  try {
    const entries = await journalService.listEntries(
      req.supabase,
      req.user.id,
    );

    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function getByKey(req, res, next) {
  try {
    const key = req.params.key;
    const entry = await journalService.getEntry(req.supabase, req.user.id, key);

    res.json({ success: true, data: entry });
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

    const entry = await journalService.upsertEntry(
      req.supabase,
      req.user.id,
      result.data.context_key,
      result.data.content,
    );

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const key = req.params.key;

    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new ValidationError(message);
    }

    const entry = await journalService.updateEntry(
      req.supabase,
      req.user.id,
      key,
      result.data.content,
    );

    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const key = req.params.key;
    await journalService.deleteEntry(req.supabase, req.user.id, key);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
