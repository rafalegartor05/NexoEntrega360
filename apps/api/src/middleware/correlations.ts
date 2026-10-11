
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const correlationMiddleware: RequestHandler = (req, res, next) => {
  const correlationId = randomUUID();

  res.locals.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  next();
};
