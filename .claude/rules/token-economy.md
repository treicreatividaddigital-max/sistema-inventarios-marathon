# Token Economy

- Un loop debe producir un solo resultado verificable.
- Micro: máximo 5 archivos leídos, 2 modificados y 2 validaciones.
- Small: máximo 8 archivos leídos, 4 modificados y 4 validaciones.
- No escanear todo el repositorio salvo justificación explícita.
- Leer símbolos y rangos relevantes antes que archivos completos.
- No leer secretos, `.env`, credenciales ni datos privados.
- Mantener reportes en 30-40 líneas.
- Mover procedimientos repetitivos a Skills.
- Usar subagentes solo para investigación aislada y read-only.
- No repetir contexto persistido en el repositorio.
- Detener el loop si el alcance crece y proponer un micro-loop separado.
