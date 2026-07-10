import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoError, parseSettingValue, supabase } from "../supabase";

type LegacyProduct = {
  id: number;
  name: string;
  category: string;
  unit: string;
  notes: string;
  price?: number;
  habitual: number;
  created_at: string;
  updated_at: string;
};

type LegacyOrder = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  status: string;
};

type LegacyOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  notes: string;
};

type LegacySetting = {
  key: string;
  value: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const sqlitePath = process.env.LEGACY_SQLITE_PATH ?? path.join(rootDir, "database", "data", "warehouse.sqlite");

const products = readTable<LegacyProduct>("select * from products order by id");
const orders = readTable<LegacyOrder>("select * from orders order by id");
const orderItems = readTable<LegacyOrderItem>("select * from order_items order by id");
const settings = readTable<LegacySetting>("select * from settings order by key");

assertNoError((await supabase.from("order_items").delete().neq("id", -1)).error, "Pulizia righe ordine legacy");
assertNoError((await supabase.from("orders").delete().neq("id", -1)).error, "Pulizia ordini legacy");
assertNoError((await supabase.from("products").delete().neq("id", -1)).error, "Pulizia prodotti legacy");
assertNoError((await supabase.from("settings").delete().neq("key", "__never__")).error, "Pulizia impostazioni legacy");

if (products.length) {
  assertNoError(
    (
      await supabase.from("products").insert(
        products.map((product) => ({
          ...product,
          price: product.price ?? 0,
          habitual: product.habitual === 1
        }))
      )
    ).error,
    "Migrazione prodotti legacy"
  );
}

if (orders.length) {
  assertNoError((await supabase.from("orders").insert(orders)).error, "Migrazione ordini legacy");
}

if (settings.length) {
  assertNoError(
    (
      await supabase.from("settings").upsert(
        settings.map((setting) => ({
          key: setting.key,
          value: safeJson(setting.value)
        })),
        { onConflict: "key" }
      )
    ).error,
    "Migrazione impostazioni legacy"
  );
}

if (orderItems.length) {
  assertNoError((await supabase.from("order_items").insert(orderItems)).error, "Migrazione righe legacy");
}

const resetResult = await supabase.rpc("reset_identity_sequences");
if (resetResult.error) {
  const message = resetResult.error.message ?? "";
  if (!message.includes("out of bounds for sequence")) {
    assertNoError(resetResult.error, "Reset sequenze legacy");
  } else {
    console.warn(`Reset sequenze legacy saltato: ${message}`);
  }
}

console.log(
  `Migrazione completata: ${products.length} prodotti, ${orders.length} ordini, ${orderItems.length} righe, ${settings.length} impostazioni.`
);

function readTable<T>(sql: string) {
  const output = execFileSync("sqlite3", [sqlitePath, "-json", sql], {
    encoding: "utf8"
  }).trim();

  return output ? (JSON.parse(output) as T[]) : [];
}

function safeJson(value: string) {
  try {
    return parseSettingValue(JSON.parse(value));
  } catch {
    return parseSettingValue(value);
  }
}
