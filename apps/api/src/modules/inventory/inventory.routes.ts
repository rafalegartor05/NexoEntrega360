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
    const organizationId = req.user!.organizationId;
    const inventory = await prisma.inventory.findMany({
      where: { organizationId },
      include: { sku: true },
      orderBy: { sku: { code: "asc" } }
    });

    const mappedInventory = inventory.map(item => ({
      id: item.id,
      skuId: item.skuId,
      code: item.sku.code,
      sku: item.sku.code,
      name: item.sku.name,
      product: item.sku.name,
      productName: item.sku.name,
      quantity: item.quantity,      
      stock: item.quantity,
      existencias: item.quantity,         
      reserved: 0,
      reservado: 0,                  
      available: item.quantity      
    }));

    res.json(mappedInventory);
  } catch (error) {
    next(error);
  }
});

router.get("/skus", async (req, res, next) => {
  try {
    const organizationId = req.user!.organizationId;
    const inventory = await prisma.inventory.findMany({
      where: { organizationId },
      include: { sku: true },
      orderBy: { sku: { code: "asc" } }
    });

    res.json(inventory.map(item => ({
      skuId: item.skuId,
      code: item.sku.code,
      quantity: item.quantity
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

      // Validamos usando el campo 'quantity' con bloqueo de fila crudo
      for (const item of request.items) {
        const rows = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
          SELECT id, quantity
          FROM "Inventory"
          WHERE "organizationId" = ${user.organizationId}::uuid
            AND "skuId" = ${item.skuId}::uuid
          FOR UPDATE
        `;

        const stock = rows[0];

        if (!stock || stock.quantity < item.quantity) {
          throw new AppError(409, "Inventario insuficiente; no se reservó ninguna línea", "INSUFFICIENT_STOCK");
        }
      }

      // Actualizamos restando la cantidad reservada del stock general (o ajustando según tu lógica de negocio con quantity)
      for (const item of request.items) {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Inventory"
          WHERE "organizationId" = ${user.organizationId}::uuid AND "skuId" = ${item.skuId}::uuid
        `;

        if (rows[0]) {
          await tx.inventory.update({
            where: { id: rows[0].id },
            data: { 
              quantity: { decrement: item.quantity } 
            }
          });
        }
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