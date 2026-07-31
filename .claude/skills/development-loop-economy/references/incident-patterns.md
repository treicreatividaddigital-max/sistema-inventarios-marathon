# Incident Patterns

## Contract boundary

Capturar la request real y corregir el adaptador. No ampliar schemas para aceptar entradas inválidas.

## Identity or ownership

Separar identidad, conexión y recurso. Validar ownership antes de operaciones live.

## Platform budget

Contar fetches, probes, MCP, browser y reintentos. Reutilizar contexto por invocación.

## Smoke evidence

Usar runner persistido, RUN_ID, request/response separados, status, stderr, hash y assertions.

## Stale capture

Comprobar timestamp, deployment y hash antes de diagnosticar.

## Validator false positive

Extraer desde la ruta real y mostrar assertions individuales.

## Agent duplication

Si dos agentes investigaron lo mismo, detener concurrencia, consolidar evidencia y asignar una sola hipótesis.

## Regla de compresión

Si aparecen varios patrones, inspeccionar una sola vez la ruta crítica completa antes de implementar.
