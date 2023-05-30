import {Request, Response, NextFunction} from 'express';
import * as crypto from 'crypto';

export function reqMetaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const headers = req.headers;

  let reqId = headers['x-api-req-id'];
  if (!reqId) {
    reqId = crypto.randomUUID();
    headers['x-api-req-id'] = reqId;
  }
  (<any>req).reqMeta = {reqId};
  next();
}
