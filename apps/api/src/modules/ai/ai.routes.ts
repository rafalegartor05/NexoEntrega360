import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate, allowRoles } from "../../middleware/auth";
import { AppError } from "../../middleware/errors";

const router = Router();
router.use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SummaryInput = z.object({
  requestIds: z.array(z.string().regex(uuidRegex, "Invalid UUID format")).min(1).max(20)
});

const RecommendationSchema = z.object({
  requestId: z.string().regex(uuidRegex, "Invalid UUID format"),
  reason: z.string().max(240),
  evidenceFields: z.array(
    z.enum(["zona", "prioridad", "fechaRequerida", "observaciones"])
  ).min(1).max(3)
});

const OutputSchema = z.object({
  summary: z.string().max(600),
  recommendations: z.array(RecommendationSchema).max(5)
}).strict();

router.post("/summarize", allowRoles("COORDINADOR"), async (req, res, next) => {
  try {
    const user = req.user!;
    const input = SummaryInput.parse(req.body);

    if (new Set(input.requestIds).size !== input.requestIds.length) {
      throw new AppError(422, "IDs duplicados", "DUPLICATE_IDS");
    }

    const requests = await prisma.request.findMany({
      where: {
        id: { in: input.requestIds },
        organizationId: user.organizationId,
        status: "ENVIADA"
      },
      select: {
        id: true,
        zone: true,
        priority: true,
        requiredDate: true,
        status: true,
        observations: true
      }
    });

    if (requests.length !== input.requestIds.length) {
      throw new AppError(
        422,
        "Todas las solicitudes deben existir, pertenecer a tu organización y estar ENVIADA",
        "INVALID_REQUEST_SET"
      );
    }

    const recommendations = requests
      .slice()
      .sort((a, b) => {
        const priority = (b.priority === "ALTA" ? 1 : 0) -
          (a.priority === "ALTA" ? 1 : 0);

        return priority || a.requiredDate.getTime() - b.requiredDate.getTime();
      })
      .slice(0, 5)
      .map(request => ({
        requestId: request.id,
        reason: request.priority === "ALTA"
          ? "Prioridad ALTA registrada en la solicitud."
          : "Revisar la fecha requerida y coordinar la disponibilidad.",
        evidenceFields: request.priority === "ALTA"
          ? ["prioridad" as const]
          : ["fechaRequerida" as const]
      }));

    const output = OutputSchema.parse({
      summary: `Se analizaron ${requests.length} solicitudes ENVIADA. Revise las recomendaciones y los datos originales antes de decidir.`,
      recommendations
    });

    res.json({
      source: "deterministic",
      approved: false,
      ...output
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/summaries/:id/approve",
  allowRoles("COORDINADOR"),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      const summary = await prisma.aISummary.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        }
      });

      if (!summary) {
        throw new AppError(404, "Resumen no encontrado", "NOT_FOUND");
      }

      const updated = await prisma.$transaction(async tx => {
        const saved = await tx.aISummary.update({
          where: { id: summary.id },
          data: { approvedAt: new Date(), approvedById: user.id }
        });

        await tx.auditEvent.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "RESUMEN_IA_APROBADO",
            correlationId: String(res.locals.correlationId),
            details: { summaryId: summary.id }
          }
        });

        return saved;
      });

      res.json({ id: updated.id, approved: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;