import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        dbUser?: any;
      };
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token is missing or malformed', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        doctor: { select: { id: true, verificationStatus: true } },
        patient: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'User account is inactive or no longer exists', 403, 'ACCOUNT_INACTIVE');
    }

    let patientId = user.patient?.id;

    // Auto-provision a linked patient profile if missing (allows Admins and Doctors to book consultations & test patient flows)
    if (!patientId && user.id) {
      try {
        let existingPatient = await prisma.patient.findUnique({ where: { userId: user.id } });
        if (!existingPatient) {
          existingPatient = await prisma.patient.create({
            data: { userId: user.id },
          });
        }
        patientId = existingPatient.id;
      } catch (err) {
        // Handled if created concurrently
      }
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor?.id,
      patientId,
      dbUser: user,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token has expired. Please refresh your session.', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
}
