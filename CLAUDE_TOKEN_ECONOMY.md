# Claude Token Economy

Reglas reutilizables para reducir contexto, tokens, herramientas y ciclos innecesarios en Claude Code sin sacrificar calidad.

## 1. Principio

> Cargar poco contexto, aislar la exploración, modificar mínimamente y validar exactamente.

Claude Code carga `CLAUDE.md` en cada sesión. Mantener allí solo reglas persistentes y breves. Mover procedimientos detallados a Skills, que se cargan bajo demanda.

## 2. Distribución del contexto

Usar cada mecanismo para una sola función:

- `CLAUDE.md`: arquitectura esencial, comandos canónicos y reglas que siempre aplican.
- `.claude/rules/*.md`: reglas temáticas o por rutas.
- `.claude/skills/*/SKILL.md`: procedimientos repetibles y checklists extensos.
- subagentes: investigación amplia o independiente con contexto aislado.
- hooks: controles deterministas que deben ejecutarse siempre.
- `CLAUDE.local.md`: preferencias privadas, rutas locales y datos no compartibles.

No importar documentación extensa en `CLAUDE.md`; los imports también consumen contexto al iniciar.

## 3. Clasificación por tamaño

### Micro

- un resultado verificable
- máximo 5 archivos leídos
- máximo 2 archivos modificados
- máximo 2 validaciones principales
- sin subagentes salvo bloqueo de descubrimiento
- reporte máximo 30 líneas

### Small

- una feature o fix estrecho
- máximo 8 archivos leídos
- máximo 4 archivos modificados
- máximo 4 validaciones principales
- máximo un subagente de investigación
- reporte máximo 40 líneas

### Medium o Large

No implementar en una sola conversación. Primero crear mapa, contrato, riesgos y subloops micro/small.

## 4. Lectura eficiente

Antes de leer:

1. identificar la función o símbolo exacto;
2. usar búsqueda estrecha por nombre;
3. leer rangos relevantes, no archivos completos;
4. seguir solo llamadas directas;
5. detener la exploración cuando la ruta crítica esté explicada.

No hacer escaneos completos del repositorio por defecto. No leer carpetas generadas, dependencias, secretos, `.env`, logs históricos o artefactos no relacionados.

## 5. Uso de subagentes

Usar un subagente cuando la investigación amplia contaminaría el contexto principal.

El subagente debe recibir:

- una pregunta concreta;
- archivos o directorios permitidos;
- modo read-only cuando corresponda;
- formato de retorno breve;
- prohibición de editar o desplegar.

El retorno debe incluir solo hallazgos, evidencia, archivos relevantes y recomendación. No devolver transcripciones extensas.

No lanzar varios subagentes para investigar la misma hipótesis.

## 6. Higiene de sesión

- usar `/context` para comprobar qué está consumiendo contexto;
- usar `/compact` al terminar una fase, con foco explícito;
- abrir una sesión nueva al cambiar de milestone o cuando el contexto acumulado ya no aporta;
- no continuar un debugging sobre evidencia antigua;
- persistir decisiones en archivos del repositorio, no solo en la conversación.

## 7. Prompts compactos

Cada tarea debe contener solamente:

1. objetivo verificable;
2. archivos que puede leer;
3. archivos que puede modificar;
4. cambio requerido;
5. validación mínima;
6. restricciones no obvias;
7. formato de reporte.

Plantilla:

```text
Lee primero CLAUDE.md y CLAUDE_TOKEN_ECONOMY.md.

Objetivo:
<un resultado verificable>

Puedes leer solo:
- <archivo>

Puedes modificar solo:
- <archivo>

Restricciones:
- No escanees el repo completo.
- No toques secretos ni credenciales.
- No amplíes el alcance.
- No agregues dependencias sin demostrar necesidad.

Validación:
- <comando mínimo>

Reporta en máximo 30-40 líneas:
- archivos leídos/modificados
- resultado de validación
- caveats
- siguiente micro-loop
```

## 8. Selección de herramientas

- lectura local antes que web;
- búsqueda exacta antes que exploración amplia;
- una validación focalizada antes que toda la suite;
- hook determinista antes que recordatorio textual;
- Skill antes que pegar el mismo procedimiento otra vez;
- subagente antes que llenar el contexto principal con investigación extensa.

## 9. Condiciones de parada

Detener el loop cuando:

- crece más allá del presupuesto;
- requiere más archivos de los autorizados;
- falta confirmación para una escritura;
- la evidencia es insuficiente;
- se necesitaría repetir producción solo para explorar;
- aparece una segunda causa raíz no contemplada.

Entregar evidencia parcial concreta y proponer el siguiente micro-loop.

## 10. Reporte final

Mantenerlo corto:

- objetivo;
- archivos leídos;
- archivos modificados;
- validación;
- evidencia;
- caveats;
- siguiente paso.
