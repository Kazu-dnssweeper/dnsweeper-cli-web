import type { Request, Response, NextFunction } from 'express';

/**
 * Request logger middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
};

/**
 * Development logger with more details
 */
export const devLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers
    });
  }
  next();
};