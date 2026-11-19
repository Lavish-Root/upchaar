import { Router } from 'express';
import authRoutes from './authRoutes';
import patientRoutes from './patientRoutes';
import doctorRoutes from './doctorRoutes';
import appointmentRoutes from './appointmentRoutes';
import prescriptionRoutes from './prescriptionRoutes';
import adminRoutes from './adminRoutes';
import aiRoutes from './aiRoutes';
import homeRemedyRoutes from './homeRemedyRoutes';
import consultationRoutes from './consultationRoutes';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/response';

const router = Router();

// Public Specialties endpoint for registration and directory
router.get('/specialties', async (req, res, next) => {
  try {
    const specialties = await prisma.specialty.findMany({
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, specialties);
  } catch (err) {
    next(err);
  }
});

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/home-remedies', homeRemedyRoutes);
router.use('/consultations', consultationRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'PraanSewa Healthcare API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
