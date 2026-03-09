import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as settingsController from '../controllers/settings.js';

const router = Router();

router.use(requireAuth);

router.get('/', settingsController.get);
router.put('/', settingsController.update);

export default router;
