
import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authenticate, allowRoles } from "../../middleware/auth";
import { AppError } from "../../middleware/errors";

const router = Router();
router.use(authenticate);

router.post("/:id/dispatch", allowRoles("BODEGA"), async (req, res, next) => {
  try {
    const user = req.user!;

    await prisma.$transaction(async tx => {
      const request = await tx.request.findFirst({
        where: {
          id: req.params.id,
          organizationId: user.organizationId
        },
        include: { items: true }
      });

      if (!request) {
        throw new AppError(404, "Solicitud no encontrada", "NOT_FOUND");
      }

      if (request.status !== "RESERVADA") {
        throw new AppError(409, "Solo se despachan solicitudes RESERVADA", "INVALID_TRANSITION");
      }

      for (const item of request.items) {
        const changed = await tx.inventory.updateMany({
          where: {
            organizationId: user.organizationId,
            skuId: item.skuId,
            physicalStock: { gte: item.quantity },
            reservedStock: { gte: item.quantity }
          },
          data: {
            physicalStock: { decrement: item.quantity },
            reservedStock: { decrement: item.quantity }
          }
        });

        if (changed.count !== 1) {
          throw new AppError(409, "Inventario inconsistente", "INVENTORY_CONFLICT");
        }
      }

      const changed = await tx.request.updateMany({
        where: {
          id: request.id,
          organizationId: user.organizationId,
          status: "RESERVADA"
        },
        data: { status: "DESPACHADA" }
      });

      if (changed.count !== 1) {
        throw new AppError(409, "La solicitud cambió de estado", "CONFLICT");
      }

      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          requestId: request.id,
          action: "SOLICITUD_DESPACHADA",
          correlationId: String(res.locals.correlationId)
        }
      });
    });

    res.json({ message: "Solicitud despachada", status: "DESPACHADA" });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/deliver", allowRoles("COORDINADOR"), async (req, res, next) => {
  try {
    const user = req.user!;

    const result = await prisma.$transaction(async tx => {
      const request = await tx.request.findFirst({
        where: {
          id: req.params.id,
          organizationId: user.organizationId
        }
      });

      if (!request) {
        throw new AppError(404, "Solicitud no encontrada", "NOT_FOUND");
      }

      if (request.status !== "DESPACHADA") {
        throw new AppError(409, "Solo se entregan solicitudes DESPACHADA", "INVALID_TRANSITION");
      }

      const changed = await tx.request.updateMany({
        where: {
          id: request.id,
          organizationId: user.organizationId,
          status: "DESPACHADA"
        },
        data: { status: "ENTREGADA" }
      });

      if (changed.count !== 1) {
        throw new AppError(409, "La solicitud cambió de estado", "CONFLICT");
      }

      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          requestId: request.id,
          action: "SOLICITUD_ENTREGADA",
          correlationId: String(res.locals.correlationId)
        }
      });

      return { message: "Entrega registrada", status: "ENTREGADA" };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
