import { Router } from 'express';
import { appointmentController } from '../controllers/appointmentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', (req, res, next) => appointmentController.book(req, res, next));
router.get('/:id', (req, res, next) => appointmentController.getById(req, res, next));
router.patch('/:id/status', (req, res, next) => appointmentController.updateStatus(req, res, next));
router.patch('/:id/reschedule', (req, res, next) => appointmentController.reschedule(req, res, next));
router.delete('/:id', (req, res, next) => {
  req.body.status = 'CANCELLED';
  req.body.cancellationReason = req.body.cancellationReason || 'Cancelled by user';
  return appointmentController.updateStatus(req, res, next);
});

export default router;
