import crypto from "crypto";
import xlsx from "xlsx";
import { db } from "./db";
import { categories, collections, garmentTypes, lots, years } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

type CollectionLotRow = {
  collection: string;
  year: number | null;
  lot: string;
  lotDescription: string;
};

type ParsedTaxonomyWorkbook = {
  firstSheet: string;
  categories: string[];
  types: string[];
  years: number[];
  collectionLotRows: CollectionLotRow[];
};

type ImportCounters = {
  categoriesInserted: number;
  typesInserted: number;
  collectionsInserted: number;
  yearsInserted: number;
  lotsInserted: number;
  skippedRows: number;
  processedRows: number;
};

const EXPECTED_HEADERS = ["category", "type", "collection", "year", "lot"];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalKey(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function titleCase(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "";
  return text
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function shortHash(value: string) {
  return crypto.createHash("md5").update(value).digest("hex").slice(0, 10).toUpperCase();
}

function findHeaderIndex(rows: any[][]) {
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = rows[i] ?? [];
    const normalized = row.map((cell) => canonicalKey(cell));
    if (
      normalized.includes("category") &&
      normalized.includes("type") &&
      normalized.includes("collection")
    ) {
      return i;
    }
  }
  return -1;
}

function mapHeaderName(value: unknown) {
  const v = canonicalKey(value);

  if (v === "categoria" || v === "categoría") return "category";
  if (v === "type" || v === "tipo") return "type";
  if (v === "collection" || v === "coleccion" || v === "colección") return "collection";
  if (v === "year" || v === "ano" || v === "anio" || v === "año") return "year";
  if (v === "lot" || v === "lote") return "lot";
  if (
    v === "lot description" ||
    v === "lot_description" ||
    v === "descripcion del lote" ||
    v === "descripción del lote"
  ) {
    return "lotdescription";
  }

  return v;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = canonicalKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

export function parseTaxonomyWorkbook(buffer: Buffer): ParsedTaxonomyWorkbook {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const headerIndex = findHeaderIndex(rows);
  if (headerIndex === -1) {
    throw new Error(
      "No se encontró un encabezado válido. Usa columnas: Category, Type, Collection, Year, Lot."
    );
  }

  const rawHeaders = (rows[headerIndex] ?? []).map((cell) => mapHeaderName(cell));
  const missing = EXPECTED_HEADERS.filter((header) => !rawHeaders.includes(header));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas requeridas en el Excel: ${missing.join(", ")}`);
  }

  const dataRows = rows.slice(headerIndex + 1);

  const rawCategories: string[] = [];
  const rawTypes: string[] = [];
  const rawYears: number[] = [];
  const collectionLotRows: CollectionLotRow[] = [];

  for (const row of dataRows) {
    if (!row || row.every((cell) => normalizeText(cell) === "")) continue;

    const record = Object.fromEntries(rawHeaders.map((header, idx) => [header, row[idx]]));

    const category = titleCase(record.category);
    const type = titleCase(record.type);
    const collection = titleCase(record.collection);
    const lot = titleCase(record.lot);
    const lotDescription = normalizeText(record.lotdescription);

    const yearRaw = normalizeText(record.year);
    const yearParsed = yearRaw ? Number(String(yearRaw).replace(/[^0-9]/g, "")) : null;
    const year = Number.isFinite(yearParsed) ? yearParsed : null;

    if (category) rawCategories.push(category);
    if (type) rawTypes.push(type);
    if (year) rawYears.push(year);

    // Collections + lots sí dependen de fila
    if (collection && lot) {
      collectionLotRows.push({
        collection,
        year,
        lot,
        lotDescription,
      });
    }
  }

  return {
    firstSheet,
    categories: uniqueStrings(rawCategories),
    types: uniqueStrings(rawTypes),
    years: Array.from(new Set(rawYears)).sort((a, b) => a - b),
    collectionLotRows,
  };
}

async function getOrCreateCategory(name: string, counters: ImportCounters) {
  const [existing] = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${name})`)
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(categories).values({ name, orderIndex: 0 }).returning();
  counters.categoriesInserted += 1;
  return created;
}

async function getOrCreateType(name: string, counters: ImportCounters) {
  const [existing] = await db
    .select()
    .from(garmentTypes)
    .where(
      and(
        sql`lower(${garmentTypes.name}) = lower(${name})`,
        isNull(garmentTypes.categoryId),
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(garmentTypes)
    .values({
      name,
      categoryId: null,
    })
    .returning();

  counters.typesInserted += 1;
  return created;
}

async function getOrCreateCollection(name: string, counters: ImportCounters) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(sql`lower(${collections.name}) = lower(${name})`)
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(collections).values({ name }).returning();
  counters.collectionsInserted += 1;
  return created;
}

async function getOrCreateYear(yearValue: number, counters: ImportCounters) {
  const [existing] = await db.select().from(years).where(eq(years.year, yearValue)).limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(years)
    .values({ year: yearValue, label: String(yearValue) })
    .returning();

  counters.yearsInserted += 1;
  return created;
}

async function getOrCreateLot(
  collectionId: string,
  lotName: string,
  lotDescription: string | null,
  counters: ImportCounters
) {
  const [existing] = await db
    .select()
    .from(lots)
    .where(
      and(
        eq(lots.collectionId, collectionId),
        sql`lower(${lots.name}) = lower(${lotName})`
      )
    )
    .limit(1);

  if (existing) return existing;

  const code = `LOT-${shortHash(`${collectionId}|${lotName}`)}`;

  const [created] = await db
    .insert(lots)
    .values({
      collectionId,
      code,
      name: lotName,
      description: lotDescription || null,
    })
    .returning();

  counters.lotsInserted += 1;
  return created;
}

export async function importTaxonomyBuffer(buffer: Buffer) {
  const {
    firstSheet,
    categories: parsedCategories,
    types: parsedTypes,
    years: parsedYears,
    collectionLotRows,
  } = parseTaxonomyWorkbook(buffer);

  const counters: ImportCounters = {
    categoriesInserted: 0,
    typesInserted: 0,
    collectionsInserted: 0,
    yearsInserted: 0,
    lotsInserted: 0,
    skippedRows: 0,
    processedRows: 0,
  };

  for (const year of parsedYears) {
    counters.processedRows += 1;
    await getOrCreateYear(year, counters);
  }
  for (const category of parsedCategories) {
    counters.processedRows += 1;
    await getOrCreateCategory(category, counters);
  }

  for (const type of parsedTypes) {
    counters.processedRows += 1;
    await getOrCreateType(type, counters);
  }

  for (const row of collectionLotRows) {
    counters.processedRows += 1;

    if (!row.collection || !row.lot) {
      counters.skippedRows += 1;
      continue;
    }

    const collection = await getOrCreateCollection(row.collection, counters);

    if (row.year) {
      await getOrCreateYear(row.year, counters);
    }

    await getOrCreateLot(
      collection.id,
      row.lot,
      row.lotDescription || null,
      counters
    );
  }

  return {
    sheet: firstSheet,
    categoriesFound: parsedCategories.length,
    typesFound: parsedTypes.length,
    collectionLotRowsFound: collectionLotRows.length,
    ...counters,
  };
}