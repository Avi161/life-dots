import { z } from 'zod';
import * as authService from '../services/auth.js';
import { ensureProfile } from '../services/settings.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { ValidationError } from '../middleware/errorHandler.js';

const callbackSchema = z.object({
  code: z.string().min(1, 'Missing auth code'),
});

export async function googleLogin(req, res, next) {
  try {
    const redirectTo =
      req.query.redirect_to || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;

    const url = await authService.getGoogleOAuthUrl(redirectTo);

    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
}

export async function callback(req, res, next) {
  try {
    const result = callbackSchema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      throw new ValidationError(message);
    }

    const data = await authService.exchangeCodeForSession(result.data.code);
    await ensureProfile(supabaseAdmin, data.user.id, data.user.email);

    res.json({
      success: true,
      data: {
        user: { id: data.user.id, email: data.user.email },
        session: data.session,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    await ensureProfile(supabaseAdmin, req.user.id, req.user.email);
    const profile = await authService.getUserProfile(req.supabase, req.user.id);

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
}
