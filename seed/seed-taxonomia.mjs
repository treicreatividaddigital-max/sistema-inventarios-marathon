import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import xlsx from "xlsx";
import pg from "pg";

const { Client } = pg;
const EXCEL_PATH = path.resolve(process.cwd(), "seed", "taxonomia.xlsx");

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function canonicalKey(value) {
  return normalizeText(value).toLowerCase();
}
function titleCase(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "";
  return text
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}
function compactUpper(value) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}
function shortHash(value) {
  return crypto.createHash("md5").update(value).digest("hex").slice(0, 10).toUpperCase();
}
function mapHeaderName(value) {
  const v = canonicalKey(value);
  if (v === "equipos") return "equipo";
  if (v === "nivel de uniforme") return "nivel_uniforme";
  if (v === "tipo de sub por equipo") return "sub";
  if (v === "articulo") return "artículo";
  if (v === "ano" || v === "anio") return "año";
  return v;
}
function findHeaderIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = rows[i] || [];
    const normalized = row.map((cell) => canonicalKey(cell));
    if (normalized.includes("marca") && normalized.some((v) => v === "equipo" || v === "equipos")) return i;
  }
  return -1;
}
function parseWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex === -1) throw new Error("No se encontró un encabezado válido en el Excel.");
  const headers = (rows[headerIndex] || []).map((cell) => mapHeaderName(cell));
  const body = rows.slice(headerIndex + 1);
  const parsedRows = [];
  for (const row of body) {
    if (!row || row.every((cell) => normalizeText(cell) === "")) continue;
    const record = Object.fromEntries(headers.map((header, idx) => [header, row[idx]]));
    const team = titleCase(record.equipo);
    const article = titleCase(record["artículo"]);
    const brand = titleCase(record.marca);
    const label = titleCase(record.etiqueta);
    const kitLevel = titleCase(record.nivel_uniforme);
    const tournament = titleCase(record.torneo);
    const sub = compactUpper(record.sub || "GENERAL");
    const yearRaw = normalizeText(record["año"]);
    const year = yearRaw ? Number(String(yearRaw).replace(/[^0-9]/g, "")) : null;
    if (!team || !article) continue;
    parsedRows.push({
      team,
      article,
      brand,
      label,
      kitLevel,
      tournament,
      sub,
      year: Number.isFinite(year) ? year : null,
    });
  }
  return { sheetName, headerIndex, parsedRows };
}
function buildLotName(row) {
  return [row.brand || "SIN_MARCA", row.label || "SIN_ETIQUETA", row.kitLevel || "SIN_NIVEL", row.sub || "GENERAL"]
    .map((part) => normalizeText(part).toUpperCase())
    .join(" | ");
}
function buildLotDescription(row) {
  return [
    row.brand ? `brand=${row.brand}` : null,
    row.label ? `etiqueta=${row.label}` : null,
    row.kitLevel ? `nivel=${row.kitLevel}` : null,
    row.sub ? `sub=${row.sub}` : null,
    row.tournament ? `torneo=${row.tournament}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) throw new Error(`No existe el Excel en: ${EXCEL_PATH}`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está definido.");

  const { sheetName, headerIndex, parsedRows } = parseWorkbook(EXCEL_PATH);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  const racksDefault = [
    { code: "SIN-ASIGNAR", name: "Sin asignar", zone: "DEFAULT" },
    { code: "BODEGA", name: "Bodega", zone: "DEFAULT" },
    { code: "EXHIBICION", name: "Exhibición", zone: "DEFAULT" },
    { code: "ARCHIVO", name: "Archivo", zone: "DEFAULT" },
  ];

  let racksInserted = 0;
  for (const rack of racksDefault) {
    const exists = await client.query(`select 1 from racks where code=$1 limit 1`, [rack.code]);
    if (exists.rowCount === 0) {
      await client.query(
        `insert into racks (id, code, name, zone, qr_url) values (gen_random_uuid(), $1, $2, $3, null)`,
        [rack.code, rack.name, rack.zone],
      );
      racksInserted += 1;
    }
  }

  let categoriesInserted = 0;
  let typesInserted = 0;
  let collectionsInserted = 0;
  let yearsInserted = 0;
  let lotsInserted = 0;

  for (const row of parsedRows) {
    let categoryId;
    const categoryFound = await client.query(`select id from categories where lower(name)=lower($1) limit 1`, [row.article]);
    if (categoryFound.rowCount > 0) {
      categoryId = categoryFound.rows[0].id;
    } else {
      const categoryIns = await client.query(
        `insert into categories (id, name, description, image_url, order_index) values (gen_random_uuid(), $1, null, null, 0) returning id`,
        [row.article],
      );
      categoryId = categoryIns.rows[0].id;
      categoriesInserted += 1;
    }

    const typeFound = await client.query(
      `select id from garment_types where category_id=$1 and lower(name)=lower('TORNEO') limit 1`,
      [categoryId],
    );
    if (typeFound.rowCount === 0) {
      await client.query(
        `insert into garment_types (id, name, description, image_url, category_id) values (gen_random_uuid(), 'TORNEO', null, null, $1)`,
        [categoryId],
      );
      typesInserted += 1;
    }

    let collectionId;
    const collectionFound = await client.query(`select id from collections where lower(name)=lower($1) limit 1`, [row.team]);
    if (collectionFound.rowCount > 0) {
      collectionId = collectionFound.rows[0].id;
    } else {
      const collectionIns = await client.query(
        `insert into collections (id, name, type, year, description) values (gen_random_uuid(), $1, null, null, null) returning id`,
        [row.team],
      );
      collectionId = collectionIns.rows[0].id;
      collectionsInserted += 1;
    }

    if (row.year) {
      const yearFound = await client.query(`select id from years where year=$1 limit 1`, [row.year]);
      if (yearFound.rowCount === 0) {
        await client.query(
          `insert into years (id, year, label, created_at) values (gen_random_uuid(), $1, $2, now())`,
          [row.year, String(row.year)],
        );
        yearsInserted += 1;
      }
    }

    const lotName = buildLotName(row);
    const lotFound = await client.query(
      `select id from lots where collection_id=$1 and lower(name)=lower($2) limit 1`,
      [collectionId, lotName],
    );
    if (lotFound.rowCount === 0) {
      const code = `LOT-${shortHash(`${collectionId}|${row.brand}|${row.label}|${row.kitLevel}|${row.sub}`)}`;
      await client.query(
        `insert into lots (id, code, name, description, collection_id) values (gen_random_uuid(), $1, $2, $3, $4)`,
        [code, lotName, buildLotDescription(row) || null, collectionId],
      );
      lotsInserted += 1;
    }
  }

  await client.end();

  console.log("SEED OK");
  console.log({
    excel: EXCEL_PATH,
    sheet: sheetName,
    detectedHeaderRowIndex: headerIndex,
    processedRows: parsedRows.length,
    inserted: { racksInserted, categoriesInserted, typesInserted, collectionsInserted, yearsInserted, lotsInserted },
  });
}

main().catch((error) => {
  console.error("SEED ERROR:", error);
  process.exit(1);
});
