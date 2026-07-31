# Claude Development Token Economy

Contrato para gobernar desarrollos completos con Claude Code: descubrimiento, implementación, deploy, smoke, diagnóstico y cierre.

## 1. Máxima

> Automatizar primero cómo se valida el cambio; construir y desplegar después.

## 2. Inicio obligatorio

Leer solo lo que exista y sea relevante:

1. `CLAUDE.md`;
2. `CLAUDE_TOKEN_ECONOMY.md`;
3. este archivo;
4. estado o roadmap operativo;
5. contrato o diseño de la feature.

No repetir estos contenidos dentro del prompt.

## 3. Clasificar el loop

Elegir una clase:

- `DISCOVER`: entender ruta o causa raíz; sin cambios.
- `IMPLEMENT`: cambio local pequeño; sin deploy.
- `DEPLOY_SMOKE`: commit, deploy único y smoke canónico.
- `STATE_CLOSE`: estado, documentación y retrospective.
- `INCIDENT_DIAGNOSIS`: analizar evidencia preservada; sin repetir producción.

No mezclar descubrimiento amplio, implementación y deploy en un único loop.

## 4. Loop Plan

Crear un plan JSON antes de editar:

```json
{
  "agent": "claude",
  "taskId": "feature-or-fix",
  "size": "micro",
  "phase": "implement",
  "outcome": "Un resultado verificable.",
  "readFiles": [],
  "modifyFiles": [],
  "validationCommands": [],
  "broadScanAllowed": false,
  "subagentsAllowed": 0,
  "parallelAgentsAllowed": 0,
  "isolatedWorktrees": false,
  "deploysAllowed": 0,
  "smokesAllowed": 0,
  "productionCallsAllowed": 0,
  "productionWrites": false,
  "confirmationPresent": false,
  "boundaryQaPresent": false,
  "platformLimitsVerified": false,
  "canonicalRunner": null,
  "externalCallBudget": {
    "expected": 0,
    "limit": 0,
    "breakdown": []
  },
  "evidence": {
    "runId": false,
    "requestResponseSeparated": false,
    "hash": false,
    "assertions": false
  }
}
```

Validar con el script incluido antes de editar.

## 5. Mapear la ruta crítica una vez

Antes del primer cambio:

```text
request → dispatcher → contexto → persistencia → autenticación
→ API externa → respuesta → captura → validador
```

Para cada paso identificar:

- contrato de entrada y salida;
- store o dependencia;
- llamadas externas;
- reintentos;
- permisos;
- errores degradables;
- límites de plataforma.

No abrir un loop por síntoma cuando dos o más capas participan.

## 6. Preflight

### Producto

- schema de entrada y salida;
- allowlists y límites;
- cardinalidad;
- número de llamadas internas;
- serialización;
- estrategia de error.

### Operación

- identidad activa;
- ownership;
- conexión o recurso seleccionado;
- estado persistido;
- permisos.

### Plataforma

- subrequests o llamadas externas;
- timeout;
- rate limits;
- memoria;
- tamaño de payload;
- compatibilidad de runtime.

### Smoke

- runner persistido;
- `RUN_ID` único;
- request y response separados;
- captura también ante error;
- timestamp, tamaño y SHA-256;
- assertions individuales.

No desplegar si alguna sección no tiene una respuesta concreta.

## 7. Presupuesto de llamadas externas

Contar `fetch`, consultas HTTP, probes y reintentos reales, no solo funciones.

| Fase | DB | OAuth | API externa | Total |
|---|---:|---:|---:|---:|
| Contexto | | | | |
| Preflight | | | | |
| Operación | | | | |
| Validación | | | | |

Reutilizar por invocación:

- identidad;
- conexión seleccionada;
- token o sesión preparada;
- metadata inmutable.

No usar caché global de credenciales.

## 8. Implementación

- editar solo archivos autorizados;
- conservar contratos públicos;
- no refactorizar por estética;
- no agregar dependencias sin necesidad demostrada;
- no reparar datos durante un fix de código;
- no modificar estado operativo antes de validar producción.

Para cambios de alto riesgo, usar Plan Mode y esperar aprobación antes de editar.

## 9. QA de frontera

Además de pruebas de dominio, capturar y validar la solicitud real que sale del módulo:

- nombres y tipos permitidos;
- límites máximos;
- cantidad de llamadas;
- serialización;
- `undefined`, `NaN`, `Infinity`;
- ausencia de secretos;
- compatibilidad del runtime.

Las pruebas mockeadas deben comprobar conteos de conexión, token, refresh y API externa cuando existan límites de plataforma.

## 10. Uso correcto de Claude

### Skills

Mover procedimientos repetitivos al Skill `development-loop-economy`. No cargar el manual completo en cada sesión.

### Subagentes

Usarlos para investigación read-only, revisión o hipótesis independientes. El agente principal conserva decisión, edición y cierre.

### Hooks

Usar hooks para controles que no pueden depender de la memoria del modelo:

- bloquear deploy sin plan válido;
- impedir lectura de secretos;
- ejecutar lint focalizado tras una edición;
- verificar stage antes de commit;
- preservar evidencia después del smoke.

### Contexto

Tras descubrir la causa raíz, compactar con foco en:

- decisión tomada;
- archivos autorizados;
- contrato preservado;
- validación pendiente.

No conservar logs completos si ya existe un artefacto de evidencia.

## 11. Deploy y smoke

Un loop permite como máximo:

- un commit productivo;
- un push;
- un deploy;
- un smoke;
- un commit de estado si pasa.

No usar deploy o smoke como exploración.

El runner debe producir:

- metadata;
- request;
- response;
- status HTTP;
- exit code;
- stderr;
- timestamp;
- tamaño;
- hash;
- result/error;
- review detallado.

## 12. Fallos

Preservar evidencia antes de diagnosticar.

Clasificar:

- contrato;
- identidad/ownership;
- persistencia;
- autenticación;
- presupuesto de plataforma;
- runtime;
- captura/freshness;
- parser/validador;
- calidad funcional.

Si existe una captura fresca, no repetir producción para averiguar qué falló.

Cuando el fallo reaparece después de un fix:

1. confirmar que el deployment contiene el cambio;
2. comprobar que la ruta nueva se usa realmente;
3. expandir una sola vez todas las llamadas internas;
4. verificar supuestos con mocks o instrumentación local;
5. aplicar un fix en la capa responsable.

## 13. Concurrencia

- un solo agente implementa una unidad de cambio;
- revisores pueden trabajar en paralelo solo sobre contextos read-only;
- agentes que editan deben usar worktrees aislados;
- nunca permitir dos agentes modificando los mismos archivos;
- ningún subagente despliega o escribe producción.

## 14. Matriz mínima de validación

| Cambio | Validación mínima |
|---|---|
| Estado/docs | parseo + QA de estado |
| Dominio | QA focalizada |
| Adaptador/API | build + QA de frontera |
| Runtime | build + QA runtime |
| Runner | QA simulada del runner |
| Deploy | health + smoke afectado |
| Grafo | solo si cambió |

## 15. Cierre

Cerrar solo con:

- QA local verde;
- deployment identificado;
- smoke fresco;
- evidencia con hash;
- contrato y seguridad aprobados;
- estado actualizado;
- retrospective breve.

Registrar:

- qué escapó al preflight;
- qué QA faltaba;
- qué automatización se añadió;
- qué regla persistente cambia.
