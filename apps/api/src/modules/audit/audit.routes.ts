
import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authenticate, allowRoles } from "../../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(allowRoles("COORDINADOR", "BODEGA", "AUDITOR"));

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where = {
      organizationId: req.user!.organizationId,
      ...(typeof req.query.requestId === "string"
        ? { requestId: req.query.requestId }
        : {})
    };

    const [total, data] = await prisma.$transaction([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        include: {
          user: { select: { email: true, role: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    res.json({ data, total, page, limit });
  } catch (error) {
    next(error);
  }
});

export default router;
