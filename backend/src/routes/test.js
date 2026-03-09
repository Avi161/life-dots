import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

router.post('/create-test-user', async (req, res, next) => {
  try {
    const email = `test-${Date.now()}@test-runner.local`;
    const password = `test-${Date.now()}`;

    const { data: user, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      return res.status(500).json({ success: false, error: { message: createError.message } });
    }

    const { data: session, error: loginError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (loginError) {
      return res.status(500).json({ success: false, error: { message: loginError.message } });
    }

    res.status(201).json({
      success: true,
      data: {
        user_id: user.user.id,
        email,
        access_token: session.session.access_token,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
