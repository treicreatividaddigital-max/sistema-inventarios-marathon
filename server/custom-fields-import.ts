import XLSX from 'xlsx';
import { db } from './db';
import { customFields, customFieldOptions } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';

export type CustomFieldImportSummary = {
  rows: number;
  fieldsInserted: number;
  fieldsUpdated: number;
  optionsInserted: number;
  optionsSkipped: number;
  skippedRows: number;
};

type ImportRow = {
  fieldKey: string;
  fieldLabel: string;
  optionValue: string;
  optionLabel: string;
  inputType: string;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  sortOrder: number;
};

function normalizeText(value: any): string {
  return String(value ?? '').trim();
}

function normalizeKey(value: any): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function toBool(value: any, fallback = false) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return fallback;
  return ['1', 'true', 'yes', 'si', 'sí', 'y'].includes(text);
}

function toInt(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseWorkbook(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const preferredSheetName =
    workbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'CUSTOM_FIELDS') ||
    workbook.SheetNames.find((name) => {
      const sheet = workbook.Sheets[name];
      const preview = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      if (!preview.length) return false;
      const first = preview[0] || {};
      const keys = Object.keys(first).map((k) => String(k).trim().toLowerCase());
      return keys.includes('field_key') || keys.includes('key') || keys.includes('campo');
    }) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[preferredSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  return rows.map((row) => ({
    fieldKey: normalizeKey(row.field_key || row.key || row.campo || row.nombre_campo || row.campo_tecnico),
    fieldLabel: normalizeText(row.field_label || row.label || row.etiqueta_campo || row.nombre || row.nombre_visible),
    optionValue: normalizeText(row.option_value || row.value || row.valor || row.opcion || row.valor_tecnico),
    optionLabel: normalizeText(row.option_label || row.option || row.label_value || row.etiqueta_opcion || row.valor_label || row.texto_visible),
    inputType: normalizeText(row.input_type || row.tipo || row.tipo_campo || 'select').toLowerCase() || 'select',
    required: toBool(row.required || row.requerido || row.obligatorio, false),
    filterable: toBool(row.filterable || row.filtrable, true),
    searchable: toBool(row.searchable || row.buscable, true),
    sortOrder: toInt(row.sort_order || row.orden || row.orden_visual, 0),
  }));
}

export async function importCustomFieldsBuffer(buffer: Buffer): Promise<CustomFieldImportSummary> {
  const parsedRows = parseWorkbook(buffer);
  const summary: CustomFieldImportSummary = {
    rows: parsedRows.length,
    fieldsInserted: 0,
    fieldsUpdated: 0,
    optionsInserted: 0,
    optionsSkipped: 0,
    skippedRows: 0,
  };

  for (const row of parsedRows) {
    if (!row.fieldKey || !row.fieldLabel) {
      summary.skippedRows += 1;
      continue;
    }

    let [field] = await db.select().from(customFields).where(eq(customFields.key, row.fieldKey)).limit(1);
    if (!field) {
      [field] = await db.insert(customFields).values({
        key: row.fieldKey,
        label: row.fieldLabel,
        inputType: row.inputType || 'select',
        scope: 'GARMENT',
        isRequired: row.required,
        isFilterable: row.filterable,
        isSearchable: row.searchable,
        isActive: true,
        sortOrder: row.sortOrder,
      }).returning();
      summary.fieldsInserted += 1;
    } else {
      const next = {
        label: row.fieldLabel || field.label,
        inputType: row.inputType || field.inputType,
        isRequired: row.required,
        isFilterable: row.filterable,
        isSearchable: row.searchable,
        sortOrder: row.sortOrder,
      };
      const changed = next.label !== field.label || next.inputType !== field.inputType || next.isRequired !== field.isRequired || next.isFilterable !== field.isFilterable || next.isSearchable !== field.isSearchable || next.sortOrder !== field.sortOrder;
      if (changed) {
        [field] = await db.update(customFields).set(next).where(eq(customFields.id, field.id)).returning();
        summary.fieldsUpdated += 1;
      }
    }

    if (!row.optionValue && !row.optionLabel) {
      continue;
    }

    const optionValue = row.optionValue || normalizeKey(row.optionLabel);
    const optionLabel = row.optionLabel || row.optionValue;
    const [existingOption] = await db.select().from(customFieldOptions).where(and(eq(customFieldOptions.fieldId, field.id), sql`lower(${customFieldOptions.value}) = lower(${optionValue})`)).limit(1);
    if (existingOption) {
      summary.optionsSkipped += 1;
      continue;
    }

    await db.insert(customFieldOptions).values({
      fieldId: field.id,
      value: optionValue,
      label: optionLabel,
      sortOrder: row.sortOrder,
      isActive: true,
    });
    summary.optionsInserted += 1;
  }

  return summary;
}

export function buildCustomFieldsTemplateBuffer(): Buffer {
  const workbook = XLSX.utils.book_new();
  const rows = [
    {
      field_key: 'marca',
      field_label: 'Marca',
      option_value: 'nike',
      option_label: 'Nike',
      input_type: 'select',
      required: 'FALSE',
      filterable: 'TRUE',
      searchable: 'TRUE',
      sort_order: 10,
    },
    {
      field_key: 'marca',
      field_label: 'Marca',
      option_value: 'umbro',
      option_label: 'Umbro',
      input_type: 'select',
      required: 'FALSE',
      filterable: 'TRUE',
      searchable: 'TRUE',
      sort_order: 20,
    },
    {
      field_key: 'torneo',
      field_label: 'Torneo',
      option_value: 'libertadores',
      option_label: 'Libertadores',
      input_type: 'select',
      required: 'FALSE',
      filterable: 'TRUE',
      searchable: 'TRUE',
      sort_order: 10,
    },
    {
      field_key: 'etiqueta',
      field_label: 'Etiqueta',
      option_value: 'juego',
      option_label: 'Juego',
      input_type: 'select',
      required: 'FALSE',
      filterable: 'TRUE',
      searchable: 'TRUE',
      sort_order: 10,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const readme = XLSX.utils.aoa_to_sheet([
    ['GUÍA RÁPIDA'],
    ['1. Usa una fila por cada opción.'],
    ['2. Si un campo tiene varias opciones, repite field_key y field_label.'],
    ['3. field_key es el nombre técnico: sin espacios, sin acentos. Ej: marca'],
    ['4. field_label es el nombre visible. Ej: Marca'],
    ['5. option_value es el valor guardado. Ej: nike'],
    ['6. option_label es lo que verá el usuario. Ej: Nike'],
    ['7. Para este proyecto usa input_type = select'],
    ['8. required, filterable y searchable aceptan TRUE o FALSE'],
    [],
    ['EJEMPLO'],
    ['marca + Nike = una fila'],
    ['marca + Umbro = otra fila'],
    ['torneo + Libertadores = otra fila'],
    [],
    ['COLUMNAS'],
    ['field_key', 'Nombre técnico del campo'],
    ['field_label', 'Nombre visible del campo'],
    ['option_value', 'Valor técnico de la opción'],
    ['option_label', 'Texto visible de la opción'],
    ['input_type', 'Usa select'],
    ['required', 'TRUE o FALSE'],
    ['filterable', 'TRUE o FALSE'],
    ['searchable', 'TRUE o FALSE'],
    ['sort_order', 'Orden visual'],
  ]);
  XLSX.utils.book_append_sheet(workbook, readme, 'README');
  XLSX.utils.book_append_sheet(workbook, ws, 'CUSTOM_FIELDS');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
