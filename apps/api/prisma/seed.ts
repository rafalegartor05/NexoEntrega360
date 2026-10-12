import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, Priority, RequestStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("DemoNexo2026!", 12);

  const organizations = [
    { id: "11111111-1111-4111-8111-111111111111", name: "ORG-A" },
    { id: "22222222-2222-4222-8222-222222222222", name: "ORG-B" }
  ];

  const roles: Role[] = [
    "SOLICITANTE",
    "COORDINADOR",
    "BODEGA",
    "AUDITOR"
  ];

  for (const org of organizations) {
    await prisma.organization.upsert({
      where: {
        id: org.id
      },
      update: {
        name: org.name
      },
      create: {
        id: org.id,
        name: org.name
      }
    });

    for (const role of roles) {
      const email = `${role.toLowerCase()}@${org.name.toLowerCase()}.test`;

      await prisma.user.upsert({
        where: { email },
        update: {
          passwordHash,
          role,
          organizationId: org.id
        },
        create: {
          email,
          passwordHash,
          role,
          organizationId: org.id
        }
      });
    }

    const skuDefinitions = [
      { code: "KIT-ALIM", name: "Kit de alimentos", stock: 100 },
      { code: "KIT-HIG", name: "Kit de higiene", stock: 80 },
      { code: "KIT-AGUA", name: "Kit de agua", stock: 120 }
    ];

    for (const definition of skuDefinitions) {
      let sku = await prisma.sKU.findFirst({
        where: {
          organizationId: org.id,
          code: definition.code
        }
      });

      if (sku) {
        sku = await prisma.sKU.update({
          where: { id: sku.id },
          data: { name: definition.name }
        });
      } else {
        sku = await prisma.sKU.create({
          data: {
            organizationId: org.id,
            code: definition.code,
            name: definition.name
          }
        });
      }

      const existingInventory = await prisma.inventory.findFirst({
        where: {
          organizationId: org.id,
          skuId: sku.id
        }
      });

      if (existingInventory) {
        await prisma.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: definition.stock }
        });
      } else {
        await prisma.inventory.create({
          data: {
            organizationId: org.id,
            skuId: sku.id,
            quantity: definition.stock
          }
        });
      }
    }
  }

  // --- Solicitud, Auditoría, IA e Idempotencia para Org A ---
  const orgA = organizations[0];
  const solicitanteA = await prisma.user.findFirst({
    where: { organizationId: orgA.id, role: "SOLICITANTE" }
  });

  if (solicitanteA) {
    const sampleSkuA = await prisma.sKU.findFirst({
      where: { organizationId: orgA.id, code: "KIT-ALIM" }
    });

    if (sampleSkuA) {
      await prisma.request.upsert({
        where: { code: "REQ-ORG-A-001" },
        update: {
          zone: "Zona Norte",
          priority: Priority.ALTA
        },
        create: {
          organizationId: orgA.id,
          code: "REQ-ORG-A-001",
          zone: "Zona Norte",
          priority: Priority.ALTA,
          requiredDate: new Date(Date.now() + 86400000 * 3),
          status: RequestStatus.ENVIADA,
          observations: "Necesario para entrega prioritaria en zona costera.",
          requesterId: solicitanteA.id,
          items: {
            create: [
              {
                skuId: sampleSkuA.id,
                quantity: 5
              }
            ]
          }
        }
      });
      console.log("Solicitud de prueba creada o actualizada para ORG-A.");
    }
  }

  const auditorA = await prisma.user.findFirst({
    where: { organizationId: orgA.id, role: "AUDITOR" }
  });

  if (auditorA) {
    await prisma.auditEvent.create({
      data: {
        organizationId: orgA.id,
        userId: auditorA.id,
        action: "INVENTORY_QUANTITY_UPDATE",
        correlationId: "c52ef5d5-f5e2-4c3a-94b7-ce0986050fd0",
        details: { description: "Ajuste inicial de inventario para ORG-A" }
      }
    });
    console.log("Evento de auditoría creado para ORG-A.");

    const coordinadorA = await prisma.user.findFirst({
      where: { organizationId: orgA.id, role: "COORDINADOR" }
    });

    if (coordinadorA) {
      await prisma.aISummary.create({
        data: {
          organizationId: orgA.id,
          creatorId: coordinadorA.id,
          summary: "El stock actual se encuentra estable, destacando el Kit de alimentos con 100 unidades y sin incidencias pendientes.",
          recommendations: { action: "Mantener niveles de stock actuales" },
          source: "SYSTEM_INIT"
        }
      });

      await prisma.idempotencyRecord.create({
        data: {
          organizationId: orgA.id,
          userId: coordinadorA.id,
          key: "req-key-org-a-inventory-12345",
          requestHash: "hash-sample-org-a-123",
          responseCode: 200,
          responseBody: { success: true, message: "Operación procesada correctamente" }
        }
      });
      console.log("AISummary e IdempotencyRecord creados para ORG-A.");
    }
  }


  // --- Solicitud, Auditoría, IA e Idempotencia para Org B ---
  const orgB = organizations[1];
  const solicitanteB = await prisma.user.findFirst({
    where: { organizationId: orgB.id, role: "SOLICITANTE" }
  });

  if (solicitanteB) {
    const sampleSkuB = await prisma.sKU.findFirst({
      where: { organizationId: orgB.id, code: "KIT-ALIM" }
    });

    if (sampleSkuB) {
      await prisma.request.upsert({
        where: { code: "REQ-ORG-B-001" },
        update: {
          zone: "Zona Sur",
          priority: Priority.NORMAL
        },
        create: {
          organizationId: orgB.id,
          code: "REQ-ORG-B-001",
          zone: "Zona Sur",
          priority: Priority.NORMAL,
          requiredDate: new Date(Date.now() + 86400000 * 5),
          status: RequestStatus.BORRADOR,
          observations: "Solicitud inicial en borrador para Org B.",
          requesterId: solicitanteB.id,
          items: {
            create: [
              {
                skuId: sampleSkuB.id,
                quantity: 3
              }
            ]
          }
        }
      });
      console.log("Solicitud de prueba creada o actualizada para ORG-B.");
    }
  }

  const auditorB = await prisma.user.findFirst({
    where: { organizationId: orgB.id, role: "AUDITOR" }
  });

  if (auditorB) {
    await prisma.auditEvent.create({
      data: {
        organizationId: orgB.id,
        userId: auditorB.id,
        action: "INVENTORY_QUANTITY_UPDATE",
        correlationId: "d63fg6e6-g6f3-5d4b-85c8-df1097161ge1",
        details: { description: "Ajuste inicial de inventario para ORG-B" }
      }
    });
    console.log("Evento de auditoría creado para ORG-B.");

    const coordinadorB = await prisma.user.findFirst({
      where: { organizationId: orgB.id, role: "COORDINADOR" }
    });

    if (coordinadorB) {
      await prisma.aISummary.create({
        data: {
          organizationId: orgB.id,
          creatorId: coordinadorB.id,
          summary: "Inventario operativo inicial registrado correctamente para la sucursal del sur.",
          recommendations: { action: "Revisar solicitudes pendientes en zona sur" },
          source: "SYSTEM_INIT"
        }
      });

      await prisma.idempotencyRecord.create({
        data: {
          organizationId: orgB.id,
          userId: coordinadorB.id,
          key: "req-key-org-b-inventory-12345",
          requestHash: "hash-sample-org-b-123",
          responseCode: 200,
          responseBody: { success: true, message: "Operación procesada correctamente" }
        }
      });
      console.log("AISummary e IdempotencyRecord creados para ORG-B.");
    }
  }

  console.log("Seed completado: organizaciones, usuarios, inventario, solicitudes, auditoría, IA e idempotencia.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());