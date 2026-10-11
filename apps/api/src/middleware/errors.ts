
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "APP_ERROR"
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next
) => {
  const correlationId = res.locals.correlationId;

  if (error instanceof ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos",
      details: error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      })),
      correlationId
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      correlationId
    });
    return;
  }

  console.error(JSON.stringify({
    level: "error",
    correlationId,
    method: req.method,
    path: req.path,
    message: error instanceof Error ? error.message : "Unknown error"
  }));

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Ocurrió un error interno",
    correlationId
  });
};
