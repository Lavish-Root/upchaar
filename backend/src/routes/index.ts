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
    console.warn('Specialties DB fetch failed, returning standard clinical specialties:', err);
    return sendSuccess(res, [
      { id: 'spec_1', name: 'Cardiology', slug: 'cardiology', description: 'Heart and cardiovascular care' },
      { id: 'spec_2', name: 'General Medicine', slug: 'general-medicine', description: 'Primary care and internal medicine' },
      { id: 'spec_3', name: 'Pediatrics', slug: 'pediatrics', description: 'Child and adolescent healthcare' },
      { id: 'spec_4', name: 'Dermatology', slug: 'dermatology', description: 'Skin, hair, and nail health' },
      { id: 'spec_5', name: 'Orthopedics', slug: 'orthopedics', description: 'Bones, joints, and musculoskeletal care' },
      { id: 'spec_6', name: 'ENT', slug: 'ent', description: 'Ear, nose, and throat' },
    ]);
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
