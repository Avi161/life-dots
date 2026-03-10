import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as journalController from '../controllers/journal.js';

const router = Router();

router.use(requireAuth);

router.get('/', journalController.list);
router.get('/:key', journalController.getByKey);
router.post('/', journalController.create);
router.put('/:key', journalController.update);
router.delete('/:key', journalController.remove);

export default router;
