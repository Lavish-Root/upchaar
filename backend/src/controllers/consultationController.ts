import { Request, Response, NextFunction } from 'express';
import { consultationService } from '../services/consultationService';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

export class ConsultationController {
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const consultation = await consultationService.getConsultationById(req.params.id, userId, role);
      return sendSuccess(res, consultation);
    } catch (err) {
      next(err);
    }
  }

  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, attachmentUrl } = req.body;
      const consultation = await consultationService.addMessage({
        consultationId: req.params.id,
        senderId: req.user!.userId,
        senderRole: req.user!.role,
        message,
        attachmentUrl,
      });
      return sendSuccess(res, consultation, 'Message sent', 201);
    } catch (err) {
      next(err);
    }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      let doctorId = req.user?.doctorId;
      if (!doctorId && req.user?.userId) {
        const doc = await prisma.doctor.findUnique({
          where: { userId: req.user.userId },
          select: { id: true },
        });
        if (doc) doctorId = doc.id;
      }
      if (!doctorId && (req.user?.role === Role.DOCTOR || req.user?.role === Role.ADMIN)) {
        const firstDoc = await prisma.doctor.findFirst({ select: { id: true } });
        if (firstDoc) doctorId = firstDoc.id;
      }
      if (!doctorId) return sendError(res, 'Only doctors can complete consultations', 403);

      const { doctorNotes } = req.body;
      const completed = await consultationService.completeConsultation(req.params.id, doctorId, doctorNotes);
      return sendSuccess(res, completed, 'Consultation completed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const consultationController = new ConsultationController();
