import { assertNoError, supabase } from "../supabase";

export async function dashboardStats() {
  const [productsResult, lastOrderResult] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  assertNoError(productsResult.error, "Calcolo totale prodotti");
  assertNoError(lastOrderResult.error, "Lettura ultimo ordine dashboard");

  return {
    totalProducts: productsResult.count ?? 0,
    lastOrder: lastOrderResult.data ?? undefined
  };
}

export async function orderStats() {
  const [productsResult, ordersResult, itemsResult] = await Promise.all([
    supabase.from("products").select("id, name, category, unit"),
    supabase.from("orders").select("id, created_at").order("created_at", { ascending: true }),
    supabase.from("order_items").select("id, order_id, product_id, quantity").gt("quantity", 0)
  ]);

  assertNoError(productsResult.error, "Lettura prodotti statistiche");
  assertNoError(ordersResult.error, "Lettura ordini statistiche");
  assertNoError(itemsResult.error, "Lettura righe statistiche");

  const productsById = new Map<number, { name: string; category: string; unit: string }>(
    (productsResult.data ?? []).map((product: { id: number; name: string; category: string; unit: string }) => [
      product.id,
      { name: product.name, category: product.category, unit: product.unit }
    ])
  );

  const frequentMap = new Map<number, { name: string; category: string; unit: string; times_ordered: number; total_quantity: number }>();
  for (const item of itemsResult.data ?? []) {
    const product = productsById.get(item.product_id);
    if (!product) continue;
    const existing = frequentMap.get(item.product_id);
    const current = existing ?? {
      name: product.name,
      category: product.category,
      unit: product.unit,
      times_ordered: 0,
      total_quantity: 0
    };
    current.times_ordered += 1;
    current.total_quantity += Number(item.quantity);
    frequentMap.set(item.product_id, current);
  }

  const frequentProducts = Array.from(frequentMap.values())
    .sort((a, b) => b.times_ordered - a.times_ordered || b.total_quantity - a.total_quantity)
    .slice(0, 12);

  const quantityByOrder = new Map<number, number>();
  for (const item of itemsResult.data ?? []) {
    quantityByOrder.set(item.order_id, (quantityByOrder.get(item.order_id) ?? 0) + Number(item.quantity));
  }

  const overTime = new Map<string, { date: string; orders: number; quantity: number }>();
  for (const order of ordersResult.data ?? []) {
    const date = order.created_at.slice(0, 10);
    const current = overTime.get(date) ?? { date, orders: 0, quantity: 0 };
    current.orders += 1;
    current.quantity += quantityByOrder.get(order.id) ?? 0;
    overTime.set(date, current);
  }

  const ordersOverTime = Array.from(overTime.values()).sort((a, b) => a.date.localeCompare(b.date));

  return { frequentProducts, ordersOverTime };
}
