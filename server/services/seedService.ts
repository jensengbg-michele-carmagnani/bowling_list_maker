import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase, assertNoError } from "../supabase";
import { getSettings, updateSettings } from "./settingsService";

type SeedProduct = {
  name: string;
  category: string;
  unit: string;
  notes?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const beverageSeedPath = path.join(rootDir, "database", "seeds", "beverage-products.json");
const kitchenSeedPath = path.join(rootDir, "database", "seeds", "kitchen-products.json");

export function seedBeverageCatalog() {
  return seedCatalog(beverageSeedPath, ["pezzi", "kg", "litri", "confezioni", "bottiglie"]);
}

export function seedKitchenCatalog() {
  return seedCatalog(kitchenSeedPath, ["pezzi", "kg", "litri", "confezioni", "bottiglie"]);
}

async function seedCatalog(seedPath: string, units: string[]) {
  const products = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedProduct[];
  const beforeResult = await supabase.from("products").select("*", { count: "exact", head: true });
  assertNoError(beforeResult.error, "Conteggio prodotti prima del seed");

  const insertResult = await supabase.from("products").upsert(
    products.map((product) => ({
      name: product.name,
      category: product.category,
      unit: product.unit,
      notes: product.notes ?? "Catalogo precaricato",
      habitual: true
    })),
    { onConflict: "name", ignoreDuplicates: true }
  );
  assertNoError(insertResult.error, "Seed catalogo prodotti");

  await mergeSettingList("categories", Array.from(new Set(products.map((product) => product.category))));
  await mergeSettingList("units", units);

  const afterResult = await supabase.from("products").select("*", { count: "exact", head: true });
  assertNoError(afterResult.error, "Conteggio prodotti dopo il seed");

  const before = beforeResult.count ?? 0;
  const after = afterResult.count ?? 0;

  return {
    totalSeedProducts: products.length,
    inserted: after - before,
    skipped: products.length - (after - before)
  };
}

async function mergeSettingList(key: "categories" | "units", values: string[]) {
  const settings = await getSettings();
  const current = safeParseArray(settings[key]);
  const next = Array.from(new Set([...current, ...values])).sort((a, b) => a.localeCompare(b, "it"));
  await updateSettings({ [key]: next });
}

function safeParseArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
