import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

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
      where: { id: org.id },
      update: { 
        name: org.name,
        code: org.name 
      },
      create: { 
        id: org.id, 
        name: org.name,
        code: org.name 
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
      const sku = await prisma.sKU.upsert({
        where: {
          code: definition.code
        },
        update: { 
          name: definition.name,
          organizationId: org.id
        },
        create: {
          organizationId: org.id,
          code: definition.code,
          name: definition.name
        }
      });

      await prisma.inventory.upsert({
        where: {
          organizationId_skuId: {
            organizationId: org.id,
            skuId: sku.id
          }
        },
        update: {
          physicalStock: definition.stock,
          reservedStock: 0
        },
        create: {
          organizationId: org.id,
          skuId: sku.id,
          physicalStock: definition.stock,
          reservedStock: 0
        }
      });
    }
  }

  // --- CREAR SOLICITUDES DE PRUEBA PARA ORG-A ---
  const orgA = organizations[0];
  const solicitante = await prisma.user.findFirst({
    where: { organizationId: orgA.id, role: "SOLICITANTE" }
  });

  if (solicitante) {
    const sampleSku = await prisma.sKU.findFirst({
      where: { organizationId: orgA.id, code: "KIT-ALIM" }
    });

    if (sampleSku) {
      const existingRequest = await prisma.request.findFirst({
        where: { organizationId: orgA.id }
      });

      if (!existingRequest) {
        await prisma.request.create({
          data: {
            organizationId: orgA.id,
            userId: solicitante.id,
            zone: "Zona Norte",
            priority: "ALTA",
            requiredDate: new Date(Date.now() + 86400000 * 3),
            status: "ENVIADA",
            observations: "Necesario para entrega prioritaria en zona costera.",
            items: {
              create: [
                {
                  skuId: sampleSku.id,
                  quantity: 5
                }
              ]
            }
          } as any
        });
        console.log("Solicitud de prueba creada para ORG-A.");
      }
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