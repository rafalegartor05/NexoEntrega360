import { Router } from "express";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middleware/auth";
import { AppError } from "../../middleware/errors";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    if (req.user!.role === "SOLICITANTE") {
      throw new AppError(403, "No tienes permiso para consultar inventario", "FORBIDDEN");
    }

    const inventory = await prisma.inventory.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { sku: true },
      orderBy: { sku: { code: "asc" } }
    });

    res.json(inventory.map(item => ({
      skuId: item.skuId,
      code: item.sku.code,
      name: item.sku.name,
      physicalStock: item.physicalStock,
      reservedStock: item.reservedStock,
      available: item.physicalStock - item.reservedStock
    })));
  } catch (error) {
    next(error);
  }
});

router.post("/requests/:id/reserve", async (req, res, next) => {
  const user = req.user!;
  const key = req.header("Idempotency-Key");

  try {
    if (user.role !== "COORDINADOR") {
      throw new AppError(403, "Solo el coordinador puede reservar", "FORBIDDEN");
    }

    if (!key || key.length > 200) {
      throw new AppError(400, "Se requiere Idempotency-Key", "IDEMPOTENCY_KEY_REQUIRED");
    }

    const requestId = req.params.id;
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ requestId, operation: "reserve" }))
      .digest("hex");

    const result = await prisma.$transaction(async tx => {
      // Búsqueda actualizada con la nueva llave compuesta [key, organizationId]
      const prior = await tx.idempotencyRecord.findUnique({
        where: {
          key_organizationId: {
            key,
            organizationId: user.organizationId
          }
        }
      });

      if (prior) {
        if (prior.requestHash !== requestHash) {
          throw new AppError(409, "La clave ya se usó con otro contenido", "IDEMPOTENCY_CONFLICT");
        }

        return { status: prior.responseCode, body: prior.responseBody };
      }

      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId: user.organizationId
        },
        include: { items: { orderBy: { skuId: "asc" } } }
      });

      if (!request) {
        throw new AppError(404, "Solicitud no encontrada", "NOT_FOUND");
      }

      if (request.status !== "ENVIADA") {
        throw new AppError(409, "La solicitud no está ENVIADA", "INVALID_TRANSITION");
      }

      for (const item of request.items) {
        const rows = await tx.$queryRaw<Array<{ id: string; physicalStock: number; reservedStock: number }>>`
          SELECT id, "physical_stock" as "physicalStock", "reserved_stock" as "reservedStock"
          FROM "inventories"
          WHERE "organization_id" = ${user.organizationId}::uuid
            AND "sku_id" = ${item.skuId}::uuid
          FOR UPDATE
        `;

        const stock = rows[0];

        if (!stock || stock.physicalStock - stock.reservedStock < item.quantity) {
          throw new AppError(409, "Inventario insuficiente; no se reservó ninguna línea", "INSUFFICIENT_STOCK");
        }
      }

      for (const item of request.items) {
        await tx.inventory.update({
          where: {
            organizationId_skuId: {
              organizationId: user.organizationId,
              skuId: item.skuId
            }
          },
          data: { reservedStock: { increment: item.quantity } }
        });
      }

      await tx.request.update({
        where: { id: request.id },
        data: { status: "RESERVADA" }
      });

      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          requestId: request.id,
          action: "SOLICITUD_RESERVADA",
          correlationId: String(res.locals.correlationId)
        }
      });

      const body = {
        requestId: request.id,
        status: "RESERVADA",
        message: "Inventario reservado correctamente"
      };

      await tx.idempotencyRecord.create({
        data: {
          key,
          userId: user.id,
          organizationId: user.organizationId,
          requestHash,
          responseCode: 200,
          responseBody: body as any,
          requestId: request.id
        }
      });

      return { status: 200, body };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      next(new AppError(409, "Conflicto de concurrencia; reintenta la operación", "CONCURRENCY_CONFLICT"));
      return;
    }

    next(error);
  }
});

export default router;