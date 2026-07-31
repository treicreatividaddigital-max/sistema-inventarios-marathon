# Loop Plan

Crear un JSON antes de editar y validarlo con `scripts/validate_loop_plan.py`.

## Campos esenciales

- `agent`: `claude` o `antigravity`.
- `size`: `micro`, `small`, `medium`, `large`.
- `phase`: `discover`, `implement`, `deploy-smoke`, `state-close`, `incident-diagnosis`.
- `outcome`: un solo resultado verificable.
- `readFiles`, `modifyFiles`, `validationCommands`.
- presupuestos de agentes, producción y llamadas externas.
- evidencia requerida para deploy/smoke.

## Regla

Medium/large debe declarar `splitIntoSubloops=true`. Un deploy-smoke exige runner, boundary QA, límites verificados, RUN_ID, request/response separados, hash y assertions.
