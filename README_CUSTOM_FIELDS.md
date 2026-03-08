# Campos configurables

## Qué hace
Este módulo permite agregar etiquetas extras a cada prenda sin cambiar la estructura base del sistema.

Ejemplos de campos:
- Marca
- Torneo
- Etiqueta
- Sponsor
- Parche
- Sub

## Qué NO cambia
Estos campos base siguen existiendo igual:
- Category
- Type
- Collection
- Year
- Lot
- Rack

## Cómo usarlo
1. Entra a **Taxonomy & Configurable Labels**.
2. Descarga **custom-fields-template.xlsx**.
3. Llena la hoja **CUSTOM_FIELDS**.
4. Sube el archivo.
5. Los campos aparecerán en crear/editar garment.

## Cómo llenar el Excel
Cada fila representa **una opción**.

Ejemplo:
- Campo: Marca
- Opción 1: Nike
- Opción 2: Umbro

Eso significa dos filas con el mismo `field_key` y distinto `option_value`.

## Columnas
- `field_key`: nombre técnico sin espacios. Ej: `marca`
- `field_label`: nombre visible. Ej: `Marca`
- `option_value`: valor técnico. Ej: `nike`
- `option_label`: texto visible. Ej: `Nike`
- `input_type`: usar `select`
- `required`: `TRUE` o `FALSE`
- `filterable`: `TRUE` o `FALSE`
- `searchable`: `TRUE` o `FALSE`
- `sort_order`: orden visual

## Ejemplo rápido
| field_key | field_label | option_value | option_label |
|---|---|---|---|
| marca | Marca | nike | Nike |
| marca | Marca | umbro | Umbro |
| torneo | Torneo | libertadores | Libertadores |

## Archivar un campo
Archivar oculta el campo del formulario, pero no borra los valores históricos ya guardados en prendas.
