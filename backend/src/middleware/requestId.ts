import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const REQUEST_ID_HEADER = 'x-request-id';

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.header(REQUEST_ID_HEADER);
  const id = incomingId && incomingId.length > 0 ? incomingId : uuidv4();

  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  next();
};
