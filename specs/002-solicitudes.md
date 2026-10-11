
# SPEC-002 — Solicitudes

Versión: 1.0
Estado: Borrador para revisión

## Historia
Como solicitante, quiero crear, editar y enviar solicitudes de kits
para registrar las necesidades de mi organización.

## Requisitos
- RF03: contenido y validación.
- RF04: transiciones permitidas.

## Criterios de aceptación
- AC-002-01: una solicitud nueva comienza en BORRADOR.
- AC-002-02: una solicitud contiene entre 1 y 10 líneas distintas.
- AC-002-03: las cantidades son enteros de 1 a 500.
- AC-002-04: los SKU deben estar activos y pertenecer a la organización.
- AC-002-05: solo el dueño edita su borrador.
- AC-002-06: solo se envía una solicitud BORRADOR.
- AC-002-07: una transición inválida devuelve 409.

## Pruebas
Cantidades límite, SKU repetidos, fechas inválidas, permisos
y transiciones no permitidas.
