import {Request, Response, NextFunction} from 'express';

export function clientMetaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  (<any>req).clientMeta = {ip}
  next();
}
