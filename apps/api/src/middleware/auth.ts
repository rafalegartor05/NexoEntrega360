
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { AppError } from "./errors";

export type AuthUser = {
  id: string;
  email: string;
  role: "SOLICITANTE" | "COORDINADOR" | "BODEGA" | "AUDITOR";
  organizationId: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Autenticación requerida", "UNAUTHORIZED");
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string"
    ) {
      throw new AppError(401, "Token inválido", "INVALID_TOKEN");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true
      }
    });

    if (!user) {
      throw new AppError(401, "Usuario no válido", "INVALID_TOKEN");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, "Token inválido o vencido", "INVALID_TOKEN"));
    }
  }
};

export function allowRoles(
  ...roles: AuthUser["role"][]
): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, "Autenticación requerida", "UNAUTHORIZED"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "Operación no permitida", "FORBIDDEN"));
      return;
    }

    next();
  };
}
