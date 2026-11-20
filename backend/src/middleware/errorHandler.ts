import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error('Unhandled API Error:', {
    method: req.method,
    url: req.originalUrl,
    error: err.message || err,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Request validation failed', 422, 'VALIDATION_ERROR', formattedErrors);
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      return sendError(
        res,
        `A record with this ${target.join(', ') || 'field'} already exists.`,
        409,
        'DUPLICATE_RECORD',
        { fields: target }
      );
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Requested resource was not found.', 404, 'NOT_FOUND');
    }
    return sendError(res, `Database operation failed: ${err.message}`, 400, 'DATABASE_ERROR');
  }

  // Handle Syntax/JSON parse error
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Malformed JSON payload in request body', 400, 'BAD_REQUEST');
  }

  // Fallback 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred';
  return sendError(res, message, statusCode, 'INTERNAL_SERVER_ERROR');
}
