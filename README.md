
# NexoEntrega 360

Sistema web de distribución comunitaria de kits.

## Tecnologías
- React y TypeScript
- Express y Node.js
- PostgreSQL
- Prisma ORM
- Docker Compose
- Vitest

## Requisitos previos
- Node.js compatible con las dependencias.
- npm.
- Docker Desktop.

## Instalación
1. Copiar `.env.example` a `.env`.
2. Instalar dependencias desde la raíz:
   npm install
3. Iniciar PostgreSQL:
   docker compose up -d postgres
4. Generar Prisma Client:
   npm run db:generate
5. Ejecutar migraciones:
   npm run db:migrate -- --name init
6. Cargar datos ficticios:
   npm run db:seed
7. Iniciar frontend y backend:
   npm run dev

## Direcciones locales
Frontend: http://localhost:5173
API: http://localhost:3000
Health: http://localhost:3000/health
Readiness: http://localhost:3000/ready

## Cuentas de demostración
Las cuentas se crean mediante el seed.
Contraseña local inicial: DemoNexo2026!

## Advertencia
El sistema es una implementación académica en desarrollo.
No utilizar datos reales ni desplegar en producción sin revisión
de seguridad, pruebas y configuración de secretos.
