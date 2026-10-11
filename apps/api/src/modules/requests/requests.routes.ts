
import { Router } from "express";
import { Prisma, RequestStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middleware/auth";
import { AppError } from "../../middleware/errors";

const router = Router();

router.use(authenticate);

const CreateSchema = z.object({
  zone: z.string().trim().min(1).max(100),
  priority: z.enum(["NORMAL", "ALTA"]).default("NORMAL"),
  requiredDate: z.iso.datetime(),
  observations: z.string().max(2000).optional(),
  items: z.array(z.object({
    skuId: z.uuid(),
    quantity: z.number().int().min(1).max(500)
  })).min(1).max(10)
}).superRefine((value, ctx) => {
  const ids = value.items.map(item => item.skuId);

  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: "custom",
      path: ["items"],
      message: "No se permiten SKU repetidos"
    });
  }
});

function canReadAll(role: Role) {
  return role !== "SOLICITANTE";
}

async function getOwnedRequest(id: string, organizationId: string, userId: string, role: Role) {
  const request = await prisma.request.findFirst({
    where: {
      id,
      organizationId,
      ...(role === "SOLICITANTE" ? { requesterId: userId } : {})
    },
    include: { items: { include: { sku: true } } }
  });

  if (!request) {
    throw new AppError(404, "Solicitud no encontrada", "NOT_FOUND");
  }

  return request;
}

router.get("/", async (req, res, next) => {
  try {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: Prisma.RequestWhereInput = {
      organizationId: user.organizationId,
      ...(canReadAll(user.role) ? {} : { requesterId: user.id }),
      ...(req.query.status ? { status: req.query.status as RequestStatus } : {}),
      ...(req.query.priority ? { priority: req.query.priority as "NORMAL" | "ALTA" } : {}),
      ...(typeof req.query.zone === "string"
        ? { zone: { contains: req.query.zone, mode: "insensitive" } }
        : {})
    };

    const [total, data] = await prisma.$transaction([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        include: { items: { include: { sku: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    res.json({ data, page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== "SOLICITANTE") {
      throw new AppError(403, "Solo el solicitante crea solicitudes", "FORBIDDEN");
    }

    const input = CreateSchema.parse(req.body);
    const date = new Date(input.requiredDate);

    const request = await prisma.$transaction(async tx => {
      const skuIds = input.items.map(item => item.skuId);

      const skus = await tx.sKU.findMany({
        where: {
          id: { in: skuIds },
          organizationId: user.organizationId,
          active: true
        }
      });

      if (skus.length !== skuIds.length) {
        throw new AppError(422, "Hay SKU inactivos o no válidos", "INVALID_SKU");
      }

      return tx.request.create({
        data: {
          code: `NEX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          requesterId: user.id,
          organizationId: user.organizationId,
          zone: input.zone,
          priority: input.priority,
          requiredDate: date,
          observations: input.observations,
          status: "BORRADOR",
          items: {
            create: input.items.map(item => ({
              skuId: item.skuId,
              quantity: item.quantity
            }))
          }
        },
        include: { items: { include: { sku: true } } }
      });
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const request = await getOwnedRequest(
      req.params.id,
      req.user!.organizationId,
      req.user!.id,
      req.user!.role
    );

    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/submit", async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== "SOLICITANTE") {
      throw new AppError(403, "Operación no permitida", "FORBIDDEN");
    }

    const request = await getOwnedRequest(
      req.params.id, user.organizationId, user.id, user.role
    );

    if (request.status !== "BORRADOR") {
      throw new AppError(409, "Solo se envían borradores", "INVALID_TRANSITION");
    }

    if (request.requiredDate < new Date()) {
      throw new AppError(422, "La fecha requerida ya pasó", "INVALID_DATE");
    }

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.request.updateMany({
        where: {
          id: request.id,
          organizationId: user.organizationId,
          requesterId: user.id,
          status: "BORRADOR"
        },
        data: { status: "ENVIADA" }
      });

      if (result.count !== 1) {
        throw new AppError(409, "La solicitud cambió de estado", "CONFLICT");
      }

      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          requestId: request.id,
          action: "SOLICITUD_ENVIADA",
          correlationId: String(res.locals.correlationId)
        }
      });

      return tx.request.findUniqueOrThrow({
        where: { id: request.id },
        include: { items: true }
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== "SOLICITANTE") {
      throw new AppError(403, "Operación no permitida", "FORBIDDEN");
    }

    const request = await getOwnedRequest(
      req.params.id, user.organizationId, user.id, user.role
    );

    if (!["ENVIADA", "RESERVADA"].includes(request.status)) {
      throw new AppError(409, "No se puede cancelar este estado", "INVALID_TRANSITION");
    }

    await prisma.$transaction(async tx => {
      if (request.status === "RESERVADA") {
        for (const item of request.items) {
          const result = await tx.inventory.updateMany({
            where: {
              organizationId: user.organizationId,
              skuId: item.skuId,
              reservedStock: { gte: item.quantity }
            },
            data: { reservedStock: { decrement: item.quantity } }
          });

          if (result.count !== 1) {
            throw new AppError(409, "Reserva inconsistente", "INVENTORY_CONFLICT");
          }
        }
      }

      const result = await tx.request.updateMany({
        where: {
          id: request.id,
          organizationId: user.organizationId,
          requesterId: user.id,
          status: request.status
        },
        data: { status: "CANCELADA" }
      });

      if (result.count !== 1) {
        throw new AppError(409, "La solicitud cambió de estado", "CONFLICT");
      }

      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          requestId: request.id,
          action: "SOLICITUD_CANCELADA",
          correlationId: String(res.locals.correlationId)
        }
      });
    });

    res.json({ message: "Solicitud cancelada" });
  } catch (error) {
    next(error);
  }
});

export default router;
