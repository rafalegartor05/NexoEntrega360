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

  // --- Solicitud de prueba para Org A ---
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

  // --- Solicitud de prueba para Org B ---
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

  console.log("Seed completado: organizaciones, usuarios, inventario y solicitudes.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());