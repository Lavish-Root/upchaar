import { Router } from 'express';
import { doctorController } from '../controllers/doctorController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { Role } from '@prisma/client';

const router = Router();

// Public doctor discovery routes
router.get('/', (req, res, next) => doctorController.discoverDoctors(req, res, next));
router.get('/specialties', (req, res, next) => doctorController.discoverDoctors(req, res, next)); // fallback
router.get('/profile/:id', (req, res, next) => doctorController.getDoctorById(req, res, next));

// Protected Doctor Portal routes
router.get('/dashboard', authenticateToken, requireRole([Role.DOCTOR, Role.ADMIN]), (req, res, next) =>
  doctorController.getDashboard(req, res, next)
);
router.get('/appointments', authenticateToken, requireRole([Role.DOCTOR, Role.ADMIN]), (req, res, next) =>
  doctorController.getAppointments(req, res, next)
);
router.put('/availability', authenticateToken, requireRole([Role.DOCTOR, Role.ADMIN]), (req, res, next) =>
  doctorController.updateAvailability(req, res, next)
);
router.get('/patients', authenticateToken, requireRole([Role.DOCTOR, Role.ADMIN]), (req, res, next) =>
  doctorController.getAssignedPatients(req, res, next)
);
router.put('/profile', authenticateToken, requireRole([Role.DOCTOR, Role.ADMIN]), (req, res, next) =>
  doctorController.updateProfile(req, res, next)
);
router.get('/:id', (req, res, next) => doctorController.getDoctorById(req, res, next));

export default router;
