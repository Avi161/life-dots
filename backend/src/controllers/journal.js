import { z } from 'zod';
import * as journalService from '../services/journal.js';
import { ValidationError } from '../middleware/errorHandler.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  entry_date: z.string().regex(datePattern, 'entry_date must be YYYY-MM-DD'),
  content: z.string().min(1, 'content cannot be empty'),
});

const updateSchema = z.object({
  content: z.string().min(1, 'content cannot be empty'),
});

const listQuerySchema = z.object({
  from: z.string().regex(datePattern, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(datePattern, 'to must be YYYY-MM-DD').optional(),
});

function validateDateParam(date) {
  if (!datePattern.test(date)) {
    throw new ValidationError('Date parameter must be YYYY-MM-DD');
  }
  return date;
}

export async function list(req, res, next) {
  try {
    const result = listQuerySchema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new ValidationError(message);
    }

    const entries = await journalService.listEntries(
      req.supabase,
      req.user.id,
      result.data,
    );

    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function getByDate(req, res, next) {
  try {
    const date = validateDateParam(req.params.date);
    const entry = await journalService.getEntry(req.supabase, req.user.id, date);

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
      result.data.entry_date,
      result.data.content,
    );

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const date = validateDateParam(req.params.date);

    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new ValidationError(message);
    }

    const entry = await journalService.updateEntry(
      req.supabase,
      req.user.id,
      date,
      result.data.content,
    );

    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const date = validateDateParam(req.params.date);
    await journalService.deleteEntry(req.supabase, req.user.id, date);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
