import { db } from "./db";
import { years } from "@shared/schema";

export async function ensureYearsSeeded() {
  const startYear = 1981;
  const endYear = new Date().getFullYear() + 5;

  for (let year = startYear; year <= endYear; year += 1) {
    await db
      .insert(years)
      .values({
        year,
        label: String(year),
      })
      .onConflictDoNothing();
  }

  console.log(`[years] ensured ${startYear}-${endYear}`);
}
