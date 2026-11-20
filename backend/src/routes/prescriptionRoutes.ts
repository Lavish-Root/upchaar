import { Router } from 'express';
import { prescriptionController } from '../controllers/prescriptionController';
import { authenticateToken } from '../middleware/auth';
import { requireRole, requireVerifiedDoctor } from '../middleware/roleGuard';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.post('/ai-draft', requireRole([Role.DOCTOR]), requireVerifiedDoctor, (req, res, next) =>
  prescriptionController.generateAiDraft(req, res, next)
);

router.post('/approve-draft', requireRole([Role.DOCTOR]), requireVerifiedDoctor, (req, res, next) =>
  prescriptionController.approveDraft(req, res, next)
);

router.post('/', requireRole([Role.DOCTOR]), requireVerifiedDoctor, (req, res, next) =>
  prescriptionController.createManual(req, res, next)
);

router.get('/', (req, res, next) => prescriptionController.getMyPrescriptions(req, res, next));
router.get('/:id', (req, res, next) => prescriptionController.getById(req, res, next));

export default router;
