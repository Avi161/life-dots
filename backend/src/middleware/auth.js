import { supabaseAdmin, createUserClient } from '../lib/supabase.js';
import { AuthenticationError } from './errorHandler.js';

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches req.user (auth user) and req.supabase (user-scoped client).
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header');
    }

    const token = header.slice(7);

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      throw new AuthenticationError('Invalid or expired token');
    }

    req.user = user;
    req.supabase = createUserClient(token);

    next();
  } catch (err) {
    next(err instanceof AuthenticationError ? err : new AuthenticationError());
  }
}
