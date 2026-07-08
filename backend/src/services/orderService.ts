import { z } from "zod";
import { assertNoError, supabase, toHabitualFlag } from "../supabase.js";

export type StoredOrder = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  status: string;
  items: Array<Record<string, unknown>>;
};

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().min(0),
  notes: z.string().optional().default("")
});

const orderSchema = z.object({
  name: z.string().trim().min(1),
  items: z.array(orderItemSchema).optional().default([])
});

type OrderRow = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  status: string;
};

type OrderItemRow = {
  id?: number;
  order_id: number;
  product_id: number;
  quantity: number;
  notes: string;
  products?: {
    id: number;
    name: string;
    category: string;
    unit: string;
    habitual: boolean;
  } | Array<{
    id: number;
    name: string;
    category: string;
    unit: string;
    habitual: boolean;
  }> | null;
};

export async function listOrders() {
  const [ordersResult, itemsResult] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("order_id, quantity").gt("quantity", 0)
  ]);

  assertNoError(ordersResult.error, "Lettura ordini");
  assertNoError(itemsResult.error, "Lettura righe ordine");

  const aggregates = new Map<number, { item_count: number; total_quantity: number }>();
  for (const item of itemsResult.data ?? []) {
    const current = aggregates.get(item.order_id) ?? { item_count: 0, total_quantity: 0 };
    current.item_count += 1;
    current.total_quantity += Number(item.quantity);
    aggregates.set(item.order_id, current);
  }

  return (ordersResult.data ?? []).map((order: OrderRow) => ({
    ...order,
    ...(aggregates.get(order.id) ?? { item_count: 0, total_quantity: 0 })
  }));
}

export async function getOrder(id: number): Promise<StoredOrder | undefined> {
  const orderResult = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  assertNoError(orderResult.error, "Lettura ordine");

  const order = orderResult.data as OrderRow | null;
  if (!order) return undefined;

  const itemsResult = await supabase
    .from("order_items")
    .select("id, order_id, product_id, quantity, notes, products!inner(id, name, category, unit, habitual)")
    .eq("order_id", id)
    .gt("quantity", 0)
    .order("product_id", { ascending: true });

  assertNoError(itemsResult.error, "Lettura dettaglio ordine");

  const items = (itemsResult.data ?? [])
    .map((item: unknown) => mapOrderItem(item as OrderItemRow))
    .sort((a: ReturnType<typeof mapOrderItem>, b: ReturnType<typeof mapOrderItem>) =>
      String(a.name).localeCompare(String(b.name), "it")
    );

  return { ...order, items } as StoredOrder;
}

export async function createOrder(input: unknown) {
  const order = orderSchema.parse(input);
  const result = await supabase.from("orders").insert({ name: order.name }).select("id").single();
  assertNoError(result.error, "Creazione ordine");
  if (!result.data) {
    throw new Error("Creazione ordine: risposta Supabase vuota");
  }
  const orderId = result.data.id;
  await replaceItems(orderId, order.items);
  return getOrder(orderId);
}

export async function updateOrder(id: number, input: unknown) {
  const order = orderSchema.partial().parse(input);
  const current = await getOrder(id);
  if (!current) return undefined;

  const { error } = await supabase
    .from("orders")
    .update({
      name: order.name ?? current.name,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  assertNoError(error, "Aggiornamento ordine");

  if (order.items) {
    await replaceItems(id, order.items);
  }

  return getOrder(id);
}

export async function duplicateOrder(id: number) {
  const original = await getOrder(id);
  if (!original) return undefined;
  const name = `${original.name as string} - copia`;
  return createOrder({ name, items: (original.items as Array<Record<string, unknown>>).map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
    notes: item.notes ?? ""
  })) });
}

export async function deleteOrder(id: number) {
  const { error, count } = await supabase.from("orders").delete({ count: "exact" }).eq("id", id);
  assertNoError(error, "Eliminazione ordine");
  return (count ?? 0) > 0;
}

export async function previousOrderItems() {
  const latestResult = await supabase.from("orders").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  assertNoError(latestResult.error, "Lettura ultimo ordine");
  if (!latestResult.data) return [];

  const itemsResult = await supabase
    .from("order_items")
    .select("product_id, quantity, notes, products!inner(name, category, unit)")
    .eq("order_id", latestResult.data.id)
    .gt("quantity", 0);

  assertNoError(itemsResult.error, "Lettura ultimo dettaglio ordine");

  return (itemsResult.data ?? [])
    .map((item: {
      product_id: number;
      quantity: number;
      notes: string;
      products?: { name: string; category: string; unit: string } | Array<{ name: string; category: string; unit: string }> | null;
    }) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return {
        product_id: item.product_id,
        quantity: Number(item.quantity),
        notes: item.notes ?? "",
        name: product?.name ?? "",
        category: product?.category ?? "",
        unit: product?.unit ?? ""
      };
    })
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "it"));
}

export async function productLastQuantities() {
  const [productsResult, ordersResult, itemsResult] = await Promise.all([
    supabase.from("products").select("id, name").order("name", { ascending: true }),
    supabase.from("orders").select("id, created_at").order("created_at", { ascending: false }),
    supabase.from("order_items").select("order_id, product_id, quantity").gt("quantity", 0)
  ]);

  assertNoError(productsResult.error, "Lettura prodotti per ultime quantità");
  assertNoError(ordersResult.error, "Lettura ordini per ultime quantità");
  assertNoError(itemsResult.error, "Lettura righe per ultime quantità");

  const itemsByOrder = new Map<number, Array<{ product_id: number; quantity: number }>>();

  for (const item of itemsResult.data ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({ product_id: item.product_id, quantity: Number(item.quantity) });
    itemsByOrder.set(item.order_id, list);
  }

  const latestByProduct = new Map<number, { last_quantity: number; last_order_date: string }>();
  for (const order of ordersResult.data ?? []) {
    for (const item of itemsByOrder.get(order.id) ?? []) {
      if (!latestByProduct.has(item.product_id)) {
        latestByProduct.set(item.product_id, {
          last_quantity: item.quantity,
          last_order_date: order.created_at
        });
      }
    }
  }

  return (productsResult.data ?? []).map((product: { id: number; name: string }) => ({
    product_id: product.id,
    name: product.name,
    last_quantity: latestByProduct.get(product.id)?.last_quantity ?? null,
    last_order_date: latestByProduct.get(product.id)?.last_order_date ?? null
  }));
}

async function replaceItems(orderId: number, items: Array<z.infer<typeof orderItemSchema>>) {
  const normalized = items.filter((item) => item.quantity > 0);
  const productIds = Array.from(new Set(normalized.map((item) => item.productId)));

  if (productIds.length) {
    const productsResult = await supabase.from("products").select("id").in("id", productIds);
    assertNoError(productsResult.error, "Verifica prodotti ordine");
    if ((productsResult.data ?? []).length !== productIds.length) {
      throw new Error("Uno o più prodotti dell'ordine non esistono");
    }
  }

  const deleteResult = await supabase.from("order_items").delete().eq("order_id", orderId);
  assertNoError(deleteResult.error, "Sostituzione righe ordine");

  if (!normalized.length) return;

  const insertResult = await supabase.from("order_items").insert(
    normalized.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      notes: item.notes ?? ""
    }))
  );

  assertNoError(insertResult.error, "Inserimento righe ordine");
}

function mapOrderItem(item: OrderItemRow) {
  const product = Array.isArray(item.products) ? item.products[0] : item.products;
  return {
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    quantity: Number(item.quantity),
    notes: item.notes ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? "",
    habitual: toHabitualFlag(product?.habitual)
  };
}
