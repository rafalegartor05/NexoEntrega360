
# SPEC-005 — Asistente de IA

Versión: 1.0
Estado: Borrador para revisión

## Historia
Como coordinador, quiero recibir un resumen de solicitudes enviadas
para decidir cuáles revisar primero.

## Requisitos
- RF10: selección y minimización de datos.
- RF11: validación de salida.
- RF12: aprobación humana y degradación controlada.

## Criterios de aceptación
- AC-005-01: se procesan como máximo 20 solicitudes ENVIADA.
- AC-005-02: solo se envían los campos permitidos.
- AC-005-03: la salida no admite IDs ajenos ni propiedades adicionales.
- AC-005-04: solo el coordinador aprueba el resumen.
- AC-005-05: el asistente no modifica inventario ni estados.
- AC-005-06: timeout o error activa una respuesta alternativa controlada.

## Pruebas
Fixture válido, JSON inválido, ID ajeno, campos extra,
inyección de instrucciones y timeout.
