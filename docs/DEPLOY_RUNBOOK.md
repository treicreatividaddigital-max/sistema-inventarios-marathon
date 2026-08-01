# Runbook de Deploy — sistema-inventarios-marathon

Flujo normalizado: **VSCode (Mac) → GitHub → Producción (Cloud Run)**.
La fuente de verdad es tu Mac + GitHub. Producción se despliega SIEMPRE
desde código commiteado, nunca editando en Cloud Shell.

Regla de oro (aprendida a la mala):
**Nunca edites código ni schema directamente en Cloud Shell.**
Todo cambio nace en VSCode, se commitea, se pushea, y recién entonces se
despliega. Si algo se tocó en Cloud Shell y no volvió al repo, el repo
deja de ser la verdad y aparecen sorpresas (ej. la columna isActive que
existía en prod pero no en GitHub).

---

## Orden de un deploy (SIEMPRE este orden)

El código nuevo suele esperar que la base ya tenga las columnas nuevas.
Por eso: **schema primero, código después.**

1. Código commiteado y pusheado a GitHub.
2. Schema de producción alineado (columnas nuevas aplicadas).
3. Deploy del código a Cloud Run.
4. Smoke test (verificar que responde y el login funciona).
5. Evidencia guardada.

---

## Preflight (antes de tocar producción)

Responde en concreto, no de memoria:

- [ ] ¿Qué cambió en `shared/schema.ts` respecto a producción?
- [ ] ¿Esas columnas/tablas ya existen en la base `marathon_inventory_qa`?
- [ ] ¿El deploy es manual (`gcloud run deploy --source`)? SÍ, lo es.
      No hay CI ni trigger de GitHub. Un `git push` NO despliega.
- [ ] ¿Hay secretos nuevos que el servicio necesite? (DATABASE_URL y
      JWT_SECRET ya vienen de Secret Manager; no meter secretos en git.)
- [ ] ¿Tengo cómo revertir? (Cloud Run guarda revisiones anteriores.)

---

## Estado actual concreto (2026-07-31)

- Mac: fuente de verdad. `isActive` en 3 tablas de `shared/schema.ts`.
- GitHub: 3 commits atrás. Falta pushear.
- Producción: le falta `isActive` en 2 de las 3 tablas.
- Deploy confirmado MANUAL (`client-name=gcloud`), sin CI. Push no despliega.

---

## PASO 1 — Commitear la limpieza de Graphify y pushear (SEGURO, no despliega)

En el Mac, en la raíz del repo:

```bash
# commitear la limpieza de graphify (sacarlo del control de versiones)
git add .gitignore
git commit -m "chore: dejar graphify como herramienta local (no versionar)"

# revisar qué se va a subir ANTES de pushear
git log origin/main..main --oneline

# pushear a GitHub (esto NO dispara ningún deploy)
git push origin main
```

Después de esto, GitHub == tu Mac. Producción sigue igual.

---

## PASO 2 — Alinear el schema de producción (CUIDADO: toca la base real)

Producción necesita las columnas `isActive` que tu código nuevo espera.
Se aplican de forma idempotente (si ya existen, no pasa nada).

Primero, identifica en qué tablas falta. En Cloud Shell, conéctate a la
base de PRODUCCIÓN en modo lectura y revisa:

```bash
gcloud sql connect ms-inv-qa-pg --user=postgres --database=marathon_inventory_qa
```

Dentro de psql, para ver qué tablas tienen isActive y cuáles no:

```sql
SELECT table_name FROM information_schema.columns
WHERE column_name = 'is_active' AND table_schema = 'public';
```

Compara con las 3 tablas que la usan en tu schema (líneas 34, 72, 83 de
shared/schema.ts). Para las que FALTEN, aplica (idempotente):

```sql
ALTER TABLE <tabla> ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

Verifica que quedó:

```sql
\d <tabla>
```

Sal con `\q`.

> Nota: usamos ALTER manual idempotente porque el proyecto no tiene
> migraciones versionadas de Drizzle. El siguiente nivel de madurez es
> adoptar `drizzle-kit generate` + migraciones versionadas para no volver
> a hacer ALTERs a mano. Ver "Mejora pendiente" abajo.

---

## PASO 3 — Deploy a Cloud Run (DEPLOY_SMOKE: un solo deploy)

Desde el código ya pusheado. Un commit, un deploy, un smoke.

```bash
# desde la raíz del repo (en Mac con gcloud auth, o clonando en Cloud Shell)
gcloud run deploy ms-inv-prod \
  --source . \
  --region us-central1 \
  --project marathon-inventarios-qa
```

No usar el deploy para explorar. Si falla, diagnosticar con logs, no
re-desplegar a ciegas.

---

## PASO 4 — Smoke test (verificar que quedó bien)

```bash
# health del servicio
curl -i https://ms-inv-prod-2f5rvkbkbq-uc.a.run.app/api/health

# (opcional) probar el login real contra producción con credenciales de prueba
```

Debe responder 200. Si el login daba error de columna, ya no debería,
porque el schema se alineó en el PASO 2.

---

## PASO 5 — Evidencia

Guarda: fecha, commit desplegado (`git rev-parse HEAD`), URL de la
revisión de Cloud Run, resultado del health y del login. Esto cierra el
loop según tus reglas de token-economy.

---

## Rollback (si algo sale mal)

Cloud Run guarda revisiones. Para volver a la anterior:

```bash
gcloud run revisions list --service ms-inv-prod --region us-central1
gcloud run services update-traffic ms-inv-prod \
  --region us-central1 --to-revisions <REVISION_ANTERIOR>=100
```

El schema NO se revierte automáticamente. Como los ALTER son aditivos
(add column), no rompen la versión anterior: una columna de más es
inofensiva para el código viejo.

---

## Mejora pendiente (cuando quieras subir de nivel)

- Adoptar migraciones versionadas de Drizzle (`drizzle-kit generate`) en
  vez de ALTERs manuales, para que el schema viaje versionado en git.
- Considerar separar QA de PRODUCCIÓN de verdad (hoy `ms-inv-prod` corre
  en el proyecto `marathon-inventarios-qa` y usa la base QA). Es un riesgo
  que prod y QA compartan instancia.
- Nunca volver a editar en Cloud Shell sin devolver el cambio al repo.
