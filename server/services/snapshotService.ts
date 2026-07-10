import { z } from "zod";
import { assertNoError, ensureDefaultSettings, parseSettingValue, supabase } from "../supabase";

const snapshotSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  products: z.array(z.object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    category: z.string(),
    unit: z.string(),
    notes: z.string().default(""),
    price: z.number().default(0),
    habitual: z.union([z.boolean(), z.number()]),
    created_at: z.string(),
    updated_at: z.string()
  })),
  orders: z.array(z.object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string()
  })),
  order_items: z.array(z.object({
    id: z.number().int().nonnegative(),
    order_id: z.number().int().nonnegative(),
    product_id: z.number().int().nonnegative(),
    quantity: z.number(),
    notes: z.string().default("")
  })),
  settings: z.array(z.object({
    key: z.string(),
    value: z.unknown()
  }))
});

export async function createDataSnapshot() {
  await ensureDefaultSettings();

  const [productsResult, ordersResult, itemsResult, settingsResult] = await Promise.all([
    supabase.from("products").select("*").order("id", { ascending: true }),
    supabase.from("orders").select("*").order("id", { ascending: true }),
    supabase.from("order_items").select("*").order("id", { ascending: true }),
    supabase.from("settings").select("key, value").order("key", { ascending: true })
  ]);

  assertNoError(productsResult.error, "Backup prodotti");
  assertNoError(ordersResult.error, "Backup ordini");
  assertNoError(itemsResult.error, "Backup righe ordine");
  assertNoError(settingsResult.error, "Backup impostazioni");

  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    products: (productsResult.data ?? []).map((product: {
      id: number;
      name: string;
      category: string;
      unit: string;
      notes: string;
      price: number;
      habitual: boolean;
      created_at: string;
      updated_at: string;
    }) => ({
      ...product,
      habitual: !!product.habitual
    })),
    orders: ordersResult.data ?? [],
    order_items: (itemsResult.data ?? []).map((item: {
      id: number;
      order_id: number;
      product_id: number;
      quantity: number;
      notes: string;
    }) => ({
      ...item,
      quantity: Number(item.quantity)
    })),
    settings: (settingsResult.data ?? []).map((row: { key: string; value: unknown }) => ({
      key: row.key,
      value: parseSettingValue(row.value)
    }))
  };
}

export async function restoreDataSnapshot(input: unknown) {
  const snapshot = snapshotSchema.parse(input);

  assertNoError((await supabase.from("order_items").delete().neq("id", -1)).error, "Pulizia righe ordine");
  assertNoError((await supabase.from("orders").delete().neq("id", -1)).error, "Pulizia ordini");
  assertNoError((await supabase.from("products").delete().neq("id", -1)).error, "Pulizia prodotti");
  assertNoError((await supabase.from("settings").delete().neq("key", "__never__")).error, "Pulizia impostazioni");

  if (snapshot.products.length) {
    assertNoError(
      (
        await supabase.from("products").insert(
          snapshot.products.map((product) => ({
            ...product,
            habitual: product.habitual === true || product.habitual === 1
          }))
        )
      ).error,
      "Ripristino prodotti"
    );
  }

  if (snapshot.orders.length) {
    assertNoError((await supabase.from("orders").insert(snapshot.orders)).error, "Ripristino ordini");
  }

  if (snapshot.settings.length) {
    assertNoError(
      (
        await supabase.from("settings").upsert(
          snapshot.settings.map((row) => ({ key: row.key, value: parseSettingValue(row.value) })),
          { onConflict: "key" }
        )
      ).error,
      "Ripristino impostazioni"
    );
  }

  if (snapshot.order_items.length) {
    assertNoError((await supabase.from("order_items").insert(snapshot.order_items)).error, "Ripristino righe ordine");
  }

  const { error } = await supabase.rpc("reset_identity_sequences");
  assertNoError(error, "Reset sequenze dopo ripristino");

  return {
    restored: true,
    counts: {
      products: snapshot.products.length,
      orders: snapshot.orders.length,
      orderItems: snapshot.order_items.length,
      settings: snapshot.settings.length
    }
  };
}
