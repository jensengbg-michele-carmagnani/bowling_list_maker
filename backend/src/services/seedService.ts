import fs from "node:fs";
import path from "node:path";
import { db, paths } from "../db.js";

type SeedProduct = {
  name: string;
  category: string;
  unit: string;
  notes?: string;
};

const beverageSeedPath = path.join(paths.databaseDir, "seeds", "beverage-products.json");
const kitchenSeedPath = path.join(paths.databaseDir, "seeds", "kitchen-products.json");

export function seedBeverageCatalog() {
  return seedCatalog(beverageSeedPath, ["pezzi", "kg", "litri", "confezioni", "bottiglie"]);
}

export function seedKitchenCatalog() {
  return seedCatalog(kitchenSeedPath, ["pezzi", "kg", "litri", "confezioni", "bottiglie"]);
}

function seedCatalog(seedPath: string, units: string[]) {
  const products = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedProduct[];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO products (name, category, unit, notes, habitual)
     VALUES (@name, @category, @unit, @notes, 1)`
  );

  const before = (db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number }).count;
  const transaction = db.transaction(() => {
    products.forEach((product) => insert.run({ ...product, notes: product.notes ?? "Catalogo precaricato" }));
    mergeSettingList("categories", Array.from(new Set(products.map((product) => product.category))));
    mergeSettingList("units", units);
  });

  transaction();
  const after = (db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number }).count;

  return {
    totalSeedProducts: products.length,
    inserted: after - before,
    skipped: products.length - (after - before)
  };
}

function mergeSettingList(key: string, values: string[]) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  const current = row ? safeParseArray(row.value) : [];
  const next = Array.from(new Set([...current, ...values])).sort((a, b) => a.localeCompare(b, "it"));
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(next));
}

function safeParseArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
