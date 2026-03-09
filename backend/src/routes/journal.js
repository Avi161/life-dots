import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as journalController from '../controllers/journal.js';

const router = Router();

router.use(requireAuth);

router.get('/', journalController.list);
router.get('/:date', journalController.getByDate);
router.post('/', journalController.create);
router.put('/:date', journalController.update);
router.delete('/:date', journalController.remove);

export default router;
