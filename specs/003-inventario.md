
# SPEC-003 — Inventario y transiciones

Versión: 1.0
Estado: Borrador para revisión

## Historia
Como coordinador, quiero reservar existencias de una solicitud enviada
para impedir que los mismos productos se asignen dos veces.

## Requisitos
- RF05: reserva atómica.
- RF06: cancelación y despacho.
- RF07: idempotencia.
- RNF02: concurrencia.

## Criterios de aceptación
- AC-003-01: una reserva válida cambia ENVIADA a RESERVADA.
- AC-003-02: una falta de stock revierte todas las modificaciones.
- AC-003-03: cancelar una reserva libera el stock reservado.
- AC-003-04: despachar disminuye stock físico y reservado.
- AC-003-05: una misma clave y contenido no duplica efectos.
- AC-003-06: una misma clave con contenido diferente devuelve 409.
- AC-003-07: dos reservas simultáneas no exceden el stock.

## Pruebas
Base PostgreSQL real, rollback, concurrencia e idempotencia.
