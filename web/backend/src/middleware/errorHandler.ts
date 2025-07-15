import type { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error('Error:', {
    status,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
      path: req.path
    }
  });
};