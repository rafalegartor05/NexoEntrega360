
# Constitution — NexoEntrega 360

## Principio 1. Seguridad
Toda operación protegida requiere identidad autenticada.
La organización se obtiene de la identidad validada por el servidor.
Los accesos entre organizaciones se comprueban mediante pruebas de API.

## Principio 2. Consistencia
Una reserva se realiza completa o no se realiza.
El inventario nunca puede tener cantidades negativas.
Se verifica mediante pruebas transaccionales sobre PostgreSQL.

## Principio 3. Trazabilidad
Cada transición exitosa genera un evento de auditoría con usuario,
organización, recurso, acción, fecha UTC y correlationId.
Se verifica comparando el estado persistido con los eventos generados.

## Principio 4. IA responsable
La IA solo recibe campos autorizados y no puede ejecutar operaciones
de inventario. Toda salida pasa por un validador estructural.
Se comprueba con fixtures válidos, inválidos y de fallo.

## Principio 5. Desarrollo guiado por especificaciones
Cada funcionalidad requiere SPEC revisada, criterios de aceptación,
implementación, pruebas y revisión humana antes de considerarse terminada.

## Principio 6. Reproducibilidad
Las dependencias tienen versiones fijadas.
La base de datos se crea mediante migraciones y datos semilla.
La ejecución se verifica desde un clon limpio.

## Principio 7. Privacidad
Se utilizan datos ficticios.
Nunca se registran contraseñas, tokens o secretos en logs.

## Principio 8. Entrega
Cada cambio relevante se relaciona con RF, RNF, AC y pruebas.
Las diferencias entre SPEC y código se documentan expresamente.
