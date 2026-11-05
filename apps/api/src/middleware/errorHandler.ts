import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if response already committed
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle PostgreSQL specific errors
  if (err.code === '23505') {
    // Unique violation (e.g., only one running session allowed)
    return res.status(409).json({
      error: 'Conflict: A running focus session is already active. Please complete or abandon it first.',
      code: 'RUNNING_SESSION_EXISTS',
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      error: 'Referenced entity does not exist.',
      code: 'FOREIGN_KEY_VIOLATION',
    });
  }

  if (err.code === '22P02') {
    // Invalid text representation (e.g. invalid UUID)
    return res.status(400).json({
      error: 'Invalid ID format. Must be a valid UUID.',
      code: 'INVALID_UUID',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  if (statusCode === 500) {
    console.error('Unhandled server error:', err);
  }

  return res.status(statusCode).json({
    error: message,
    details: err.details,
  });
}

export default errorHandler;
