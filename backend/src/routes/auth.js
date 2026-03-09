import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/auth.js';

const router = Router();

router.get('/google', authController.googleLogin);
router.get('/callback', authController.callback);
router.get('/me', requireAuth, authController.me);

export default router;
