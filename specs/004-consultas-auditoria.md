
# SPEC-004 — Consultas y auditoría

Versión: 1.0
Estado: Borrador para revisión

## Historia
Como coordinador o auditor, quiero consultar solicitudes y eventos
para verificar el estado y la trazabilidad de las operaciones.

## Requisitos
- RF08: listados y tablero.
- RF09: auditoría.
- RNF03: rendimiento.
- RNF05: accesibilidad y adaptación móvil.

## Criterios de aceptación
- AC-004-01: el listado admite paginación y filtros.
- AC-004-02: el máximo por página es 100.
- AC-004-03: cada transición exitosa genera un evento.
- AC-004-04: un usuario solo consulta datos de su organización.
- AC-004-05: no hay endpoints de edición o borrado de auditoría.

## Pruebas
Paginación, filtros, aislamiento, historial y diseño responsive.
