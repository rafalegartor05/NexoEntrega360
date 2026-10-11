import type{ Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers["x-correlation-id"] || randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  next();
};