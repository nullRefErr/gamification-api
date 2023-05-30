import {Request, Response, NextFunction} from 'express';

export function methodFilterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const method = req.method;
  if (method !== 'POST') {
    return res.status(401).send(`Method ${req.method} not allowed`);
  }
  return next();
}
