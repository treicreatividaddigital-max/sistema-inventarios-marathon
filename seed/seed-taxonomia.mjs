import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import xlsx from "xlsx";
import pg from "pg";

const { Client } = pg;

const EXCEL_PATH = path.resolve(process.cwd(), "seed", "taxonomia.xlsx");

function norm(s) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function keyOf(s) {
  return norm(s).toLowerCase();
}
function titleCase(s) {
  const t = norm(s);
  if (!t) return t;
  return t
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
function hash8(s) {
  return crypto.createHash("md5").update(String(s)).digest("hex").slice(0, 8).toUpperCase();
}
function trunc255(s) {
  const t = norm(s);
  return t.length > 255 ? t.slice(0, 255) : t;
}

function toObjectsFromAoa(rowsAoa) {
  // Encuentra la primera fila que parezca header (contiene "articulos" y "tipo")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rowsAoa.length, 10); i++) {
    const row = rowsAoa[i] || [];
    const joined = row.map((c) => keyOf(c)).join("|");
    if (joined.includes("articulos") && joined.includes("tipo")) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) {
    throw new Error("No se encontró header válido (esperaba columnas como 'articulos' y 'tipo').");
  }

  const header = (rowsAoa[headerRowIndex] || []).map((h) => keyOf(h));
  const dataRows = rowsAoa.slice(headerRowIndex + 1);

  const objs = [];
  for (const row of dataRows) {
    if (!row || row.every((c) => norm(c) === "")) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      const k = header[j];
      if (!k) continue;
      obj[k] = row[j];
    }
    objs.push(obj);
  }
  return { headerRowIndex, header, objs };
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`ERROR: No existe el Excel en: ${EXCEL_PATH}`);
    console.error(`Colócalo como: seed/taxonomia.xlsx`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL no está definido. Revisa tu .env");
    process.exit(1);
  }

  const wb = xlsx.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rowsAoa = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const { headerRowIndex, objs: rows } = toObjectsFromAoa(rowsAoa);

  // Extrae únicos
  const categoriesMap = new Map(); // key -> display
  const typesMap = new Map(); // key -> display
  const categoryTypesMap = new Map(); // catKey -> Map(typeKey -> typeDisplay)
  const collectionsMap = new Map(); // key -> { name, year, type, description }

  for (const r of rows) {
    const articulo = norm(r.articulos);
    const tipo = norm(r.tipo);
    const activo = norm(r.activo);
    const torneo = norm(r.torneo);
    const coleccion = norm(r.coleccion);

    const yearRaw = norm(r["año"] ?? r.ano ?? r.anio);
    const yearNum = yearRaw ? Number(String(yearRaw).replace(/[^\d]/g, "")) : null;
    const year = Number.isFinite(yearNum) ? yearNum : null;

    if (articulo) categoriesMap.set(keyOf(articulo), titleCase(articulo));
    if (tipo) typesMap.set(keyOf(tipo), titleCase(tipo));


    // Mapear types SOLO dentro de su category (evita producto cartesiano)
    if (articulo && tipo) {
      const catKey = keyOf(articulo);
      const typeKey = keyOf(tipo);
      const typeDisplay = titleCase(tipo);
      if (!categoryTypesMap.has(catKey)) categoryTypesMap.set(catKey, new Map());
      categoryTypesMap.get(catKey).set(typeKey, typeDisplay);
    }
    const parts = [];
    if (activo) parts.push(titleCase(activo));
    if (year) parts.push(String(year));
    if (torneo) parts.push(titleCase(torneo));
    if (coleccion) parts.push(titleCase(coleccion));

    const collectionName = trunc255(parts.join(" • "));
    if (collectionName) {
      const k = keyOf(collectionName);
      if (!collectionsMap.has(k)) {
        const desc = [
          activo ? `activo=${norm(activo)}` : null,
          torneo ? `torneo=${norm(torneo)}` : null,
          coleccion ? `coleccion=${norm(coleccion)}` : null,
        ]
          .filter(Boolean)
          .join("; ");

        collectionsMap.set(k, {
          name: collectionName,
          year,
          type: coleccion ? titleCase(coleccion) : null,
          description: desc || null,
        });
      }
    }
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // RACKS default (idempotente)
  const racks = [
    { code: "SIN-ASIGNAR", name: "Sin asignar", zone: "DEFAULT" },
    { code: "BODEGA", name: "Bodega", zone: "DEFAULT" },
    { code: "EXHIBICION", name: "Exhibición", zone: "DEFAULT" },
    { code: "ARCHIVO", name: "Archivo", zone: "DEFAULT" },
  ];
  let racksInserted = 0;
  for (const r of racks) {
    const exists = await client.query(`select 1 from racks where code=$1 limit 1`, [r.code]);
    if (exists.rowCount === 0) {
      await client.query(
        `insert into racks (id, code, name, zone, qr_url) values (gen_random_uuid(), $1, $2, $3, null)`,
        [r.code, r.name, r.zone]
      );
      racksInserted++;
    }
  }

  // CATEGORIES
  const categoryIdsByKey = new Map();
  let categoriesInserted = 0;
  for (const [k, display] of categoriesMap.entries()) {
    const found = await client.query(`select id from categories where lower(name)=lower($1) limit 1`, [display]);
    if (found.rowCount > 0) {
      categoryIdsByKey.set(k, found.rows[0].id);
      continue;
    }
    const ins = await client.query(
      `insert into categories (id, name, description, image_url, order_index)
       values (gen_random_uuid(), $1, null, null, 0)
       returning id`,
      [display]
    );
    categoryIdsByKey.set(k, ins.rows[0].id);
    categoriesInserted++;
  }

  // GARMENT_TYPES por cada category (solo pairs category/type del Excel)
  let typesInserted = 0;
  for (const [catKey, catId] of categoryIdsByKey.entries()) {
    const perCat = categoryTypesMap.get(catKey);
    // Si no hay mapeo por categoría, no insertamos nada (más seguro que inventar combinaciones)
    if (!perCat || perCat.size === 0) continue;

    for (const [, typeDisplay] of perCat.entries()) {
      const found = await client.query(
        `select id from garment_types where category_id=$1 and lower(name)=lower($2) limit 1`,
        [catId, typeDisplay]
      );
      if (found.rowCount > 0) continue;

      await client.query(
        `insert into garment_types (id, name, description, image_url, category_id)
         values (gen_random_uuid(), $1, null, null, $2)`,
        [typeDisplay, catId]
      );
      typesInserted++;
    }
  }

console.log("SEED OK");
  console.log({
    excel: EXCEL_PATH,
    sheet: sheetName,
    detectedHeaderRowIndex: headerRowIndex,
    uniques: {
      categories: categoriesMap.size,
      types: typesMap.size,
      collections: collectionsMap.size,
    },
    inserted: {
      racksInserted,
      categoriesInserted,
      typesInserted,
      collectionsInserted,
      lotsInserted,
    },
  });
}

main().catch((e) => {
  console.error("SEED ERROR:", e);
  process.exit(1);
});