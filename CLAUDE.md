
<!-- BEGIN token-economy (managed by setup.sh) -->
# AI Development Economy

- Sigue `CLAUDE_TOKEN_ECONOMY.md` para limitar contexto, archivos, herramientas y reportes.
- Para features, debugging, integraciones, deploys o incidentes, invoca `/development-loop-economy` antes de editar.
- No hagas escaneos amplios, deploys exploratorios ni escrituras productivas sin confirmación.
- Usa Skills para procedimientos; no pegues manuales extensos en la conversación.
- Usa subagentes solo para investigación read-only acotada y devuelve resúmenes breves.
- Conserva evidencia verificable antes de diagnosticar fallos de producción.
<!-- END token-economy -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
