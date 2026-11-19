import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export function logAudit(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run after response finishes
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.userId || null;
          const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
          const userAgent = req.headers['user-agent'] || 'Unknown';
          const entityId = req.params?.id || req.body?.id || null;

          await prisma.auditLog.create({
            data: {
              userId,
              action,
              entityType,
              entityId: entityId ? String(entityId) : null,
              details: JSON.stringify({
                method: req.method,
                url: req.originalUrl,
                params: req.params,
                query: req.query,
              }),
              ipAddress,
              userAgent,
            },
          });
        } catch (error) {
          console.error('Audit log write error:', error);
        }
      }
    });

    next();
  };
}
