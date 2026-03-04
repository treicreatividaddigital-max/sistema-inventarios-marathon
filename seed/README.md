# Seed - Taxonomía (Producción)

Este seed carga catálogos iniciales en Postgres (idempotente):
- racks (DEFAULT)
- categories
- garment_types (solo pairs category/type que existan en el Excel)
- collections
- lots (1 inicial por colección)

## Requisitos
- `DATABASE_URL` apuntando a la DB objetivo
- Excel en `seed/taxonomia.xlsx`

## Ejecutar
npm run seed:taxonomy

## Nota
No migra garments ni movements. Solo prepara la taxonomía.
