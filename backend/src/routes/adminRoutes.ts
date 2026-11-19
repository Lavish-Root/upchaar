import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { Role } from '@prisma/client';
import { logAudit } from '../middleware/auditLogger';

const router = Router();

router.use(authenticateToken);
router.use(requireRole([Role.ADMIN]));

router.get('/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));
router.get('/doctors', (req, res, next) => adminController.getDoctors(req, res, next));
router.patch(
  '/doctors/:id/verification',
  logAudit('VERIFY_DOCTOR', 'DOCTOR'),
  (req, res, next) => adminController.updateDoctorVerification(req, res, next)
);

router.get('/patients', (req, res, next) => adminController.getPatients(req, res, next));
router.patch(
  '/users/:userId/toggle-status',
  logAudit('TOGGLE_USER_STATUS', 'USER'),
  (req, res, next) => adminController.toggleUserActive(req, res, next)
);

router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));
router.get('/specialties', (req, res, next) => adminController.getSpecialties(req, res, next));
router.post('/specialties', (req, res, next) => adminController.createSpecialty(req, res, next));

export default router;
