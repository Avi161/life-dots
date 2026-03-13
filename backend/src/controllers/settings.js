import { z } from 'zod';
import * as settingsService from '../services/settings.js';
import { ValidationError } from '../middleware/errorHandler.js';

const updateSchema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date must be YYYY-MM-DD').optional(),
  expected_lifespan: z.number().int().min(1).max(150).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  heartbeat_enabled: z.boolean().optional(),
  dot_meta: z.record(
    z.string(),
    z.object({
      color: z.string().nullable(),
      tag: z.string().nullable(),
    }),
  ).optional(),
  journal_font: z.string().optional(),
  journal_font_size: z.string().optional(),
}).strict();

export async function get(req, res, next) {
  try {
    const settings = await settingsService.getSettings(req.supabase, req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new ValidationError(message);
    }

    if (Object.keys(result.data).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const settings = await settingsService.updateSettings(
      req.supabase,
      req.user.id,
      result.data,
    );

    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}
