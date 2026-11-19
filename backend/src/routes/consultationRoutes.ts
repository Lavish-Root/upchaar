import { Router } from 'express';
import { consultationController } from '../controllers/consultationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/:id', (req, res, next) => consultationController.getById(req, res, next));
router.post('/:id/messages', (req, res, next) => consultationController.addMessage(req, res, next));
router.patch('/:id/complete', (req, res, next) => consultationController.complete(req, res, next));

export default router;
