import { Request, Response, NextFunction } from 'express';
import { prescriptionService } from '../services/prescriptionService';
import {
  aiPrescriptionDraftSchema,
  approvePrescriptionDraftSchema,
  createPrescriptionSchema,
} from '../validators';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';

export class PrescriptionController {
  async generateAiDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Only doctors can use AI prescription drafting', 403);

      const validated = aiPrescriptionDraftSchema.parse(req.body);
      const draft = await prescriptionService.generateAiDraft({
        ...validated,
        doctorId,
      });

      return sendSuccess(res, draft, 'AI clinical draft generated for review');
    } catch (err) {
      next(err);
    }
  }

  async approveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Only authorized doctors can approve prescriptions', 403);

      const validated = approvePrescriptionDraftSchema.parse(req.body);
      const prescription = await prescriptionService.approvePrescriptionDraft({
        ...validated,
        doctorId,
        ipAddress: req.ip,
      });

      return sendSuccess(res, prescription, 'Prescription clinically approved and signed', 201);
    } catch (err) {
      next(err);
    }
  }

  async createManual(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Only authorized doctors can create prescriptions', 403);

      const validated = createPrescriptionSchema.parse(req.body);
      const prescription = await prescriptionService.createManualPrescription({
        ...validated,
        doctorId,
      });

      return sendSuccess(res, prescription, 'Prescription created and signed', 201);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const prescription = await prescriptionService.getPrescriptionById(req.params.id);
      return sendSuccess(res, prescription);
    } catch (err) {
      next(err);
    }
  }

  async getMyPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      const patientId = req.user?.patientId;

      if (doctorId) {
        const prescriptions = await prisma.prescription.findMany({
          where: { doctorId },
          include: {
            items: true,
            patient: {
              include: { user: { select: { fullName: true, email: true, phone: true } } },
            },
            approvals: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return sendSuccess(res, prescriptions);
      }

      if (patientId) {
        const prescriptions = await prisma.prescription.findMany({
          where: { patientId },
          include: {
            items: true,
            doctor: {
              include: { user: { select: { fullName: true } } },
            },
            approvals: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return sendSuccess(res, prescriptions);
      }

      return sendSuccess(res, []);
    } catch (err) {
      next(err);
    }
  }
}

export const prescriptionController = new PrescriptionController();
