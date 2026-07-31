---
name: development-loop-economy
description: Gobierna desarrollos, debugging, integraciones, deploys, smoke tests e incidentes con Claude Code para reducir contexto, tokens y ciclos fallidos. Usar antes de cambios multiarchivo, APIs, OAuth, Workers, producción, límites de plataforma o cuando una tarea ya produjo loops repetitivos.
---

# Development Loop Economy

Aplicar un ciclo acotado y verificable.

## Inicio

1. Leer `CLAUDE.md`, `CLAUDE_TOKEN_ECONOMY.md` y `CLAUDE_DEVELOPMENT_TOKEN_ECONOMY.md` si existen.
2. Clasificar el loop: `DISCOVER`, `IMPLEMENT`, `DEPLOY_SMOKE`, `STATE_CLOSE` o `INCIDENT_DIAGNOSIS`.
3. Definir un único resultado verificable.
4. Crear un Loop Plan basado en `references/loop-plan.md`.
5. Validarlo con `scripts/validate_loop_plan.py` antes de editar.

## Flujo

1. Mapear una vez la ruta completa: request, contexto, persistencia, autenticación, API, respuesta, captura y validador.
2. Ejecutar preflight de producto, operación, plataforma y smoke.
3. Contar llamadas externas reales, incluidos probes y reintentos.
4. Implementar solo en archivos autorizados.
5. Validar dominio y frontera.
6. Desplegar como máximo una vez y ejecutar un solo smoke canónico.
7. Preservar `RUN_ID`, request, response, status, hash y assertions.
8. Diagnosticar desde evidencia; no repetir producción para explorar.
9. Cerrar con retrospective y regla persistente.

## Claude Code

- Mantener `CLAUDE.md` breve; mover procedimientos a Skills.
- Usar subagentes para investigación aislada y read-only.
- Usar hooks para gates deterministas.
- Compactar al terminar fases y persistir decisiones en archivos.
- No permitir que subagentes editen los mismos archivos o desplieguen.

## Presupuesto

Micro: 5 lecturas, 2 modificaciones, 2 validaciones.

Small: 8 lecturas, 4 modificaciones, 4 validaciones.

Medium/large: dividir antes de implementar.

## Referencias

- `references/loop-plan.md`: formato y ejemplo.
- `references/incident-patterns.md`: clasificación de fallos.
- `scripts/validate_loop_plan.py`: gate determinista.
