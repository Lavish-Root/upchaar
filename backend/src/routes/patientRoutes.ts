import { Router } from 'express';
import { patientController } from '../controllers/patientController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireRole([Role.PATIENT, Role.ADMIN]));

router.get('/profile', (req, res, next) => patientController.getProfile(req, res, next));
router.put('/profile', (req, res, next) => patientController.updateProfile(req, res, next));
router.get('/appointments', (req, res, next) => patientController.getAppointments(req, res, next));
router.get('/medical-records', (req, res, next) => patientController.getMedicalRecords(req, res, next));
router.post('/medical-records', (req, res, next) => patientController.addMedicalRecord(req, res, next));
router.get('/prescriptions', (req, res, next) => patientController.getPrescriptions(req, res, next));
router.get('/health-overview', (req, res, next) => patientController.getHealthOverview(req, res, next));

export default router;
