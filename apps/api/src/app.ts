
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { correlationMiddleware } from "./middleware/correlations";
import { errorHandler } from "./middleware/errors";

import authRoutes from "./modules/auth/auth.routes";
import requestRoutes from "./modules/requests/requests.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import transitionRoutes from "./modules/requests/transitions";
import auditRoutes from "./modules/audit/audit.routes";
import aiRoutes from "./modules/ai/ai.routes";

export const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Idempotency-Key"
  ]
}));

app.use(express.json({ limit: "100kb" }));
app.use(correlationMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  const { prisma } = await import("./db/prisma.js");

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/requests", transitionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/ai", aiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Ruta no encontrada",
    correlationId: res.locals.correlationId
  });
});

app.use(errorHandler);
