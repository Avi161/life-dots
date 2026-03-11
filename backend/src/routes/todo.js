import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as todoController from '../controllers/todo.js';

const router = Router();

router.use(requireAuth);

router.get('/', todoController.listAll);
router.get('/:contextKey', todoController.getByContext);
router.post('/', todoController.create);
router.put('/:id', todoController.update);
router.delete('/:id', todoController.remove);

export default router;
