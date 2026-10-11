
# SPEC-001 — Identidad y permisos

Versión: 1.0
Estado: Borrador para revisión

## Historia
Como usuario de NexoEntrega 360, quiero autenticarme con mi cuenta
para acceder exclusivamente a los recursos permitidos por mi rol
y organización.

## Requisitos
- RF01: autenticación.
- RF02: aislamiento organizacional.
- RNF01: autorización en servidor.

## Criterios de aceptación
- AC-001-01: credenciales válidas permiten iniciar sesión.
- AC-001-02: credenciales inválidas devuelven 401.
- AC-001-03: una acción no autorizada devuelve 403.
- AC-001-04: un recurso de otra organización devuelve 404.
- AC-001-05: la organización se deriva de la identidad autenticada.

## Pruebas
- Login correcto e incorrecto.
- Usuario sin token.
- Usuario con rol insuficiente.
- Lecturas y escrituras cruzadas entre organizaciones.

## Dependencias
Base de datos, cuentas semilla y middleware de autenticación.
