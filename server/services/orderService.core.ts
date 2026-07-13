import { z } from "zod";
import {
  buildDuplicateListName,
  resolveListName,
  resolveUpdatedListName,
  type ListStatus
} from "../../shared/orderLists";

export type StoredOrder = {
  id: number;
  name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  status: ListStatus;
  items: Array<Record<string, unknown>>;
  preview_items?: Array<Record<string, unknown>>;
  item_count?: number;
  total_quantity?: number;
};

type OrderServiceDependencies = {
  supabase: {
    from: (table: string) => any;
  };
  getProductIcon: (productId: number) => string;
  assertNoError: (error: { message: string } | null, context: string) => void;
  toHabitualFlag: (value: boolean | null | undefined) => 0 | 1;
};

const orderStatusSchema = z.enum(["draft", "sent", "received"]);

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().min(0),
  notes: z.string().optional().default("")
});

const orderSchema = z.object({
  companyName: z.string().trim().min(1, "Il nome dell'azienda e obbligatorio"),
  name: z.string().trim().optional(),
  status: orderStatusSchema.optional().default("draft"),
  items: z.array(orderItemSchema).optional().default([])
});

type OrderRow = {
  id: number;
  name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  status: ListStatus;
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

export function createOrderService({
  supabase,
  getProductIcon,
  assertNoError,
  toHabitualFlag
}: OrderServiceDependencies) {
  async function listOrders() {
    const [ordersResult, itemsResult] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase
        .from("order_items")
        .select("order_id, product_id, quantity, products(name, category, unit, habitual)")
        .gt("quantity", 0)
    ]);

    assertNoError(ordersResult.error, "Lettura ordini");
    assertNoError(itemsResult.error, "Lettura righe ordine");

    const aggregates = new Map<number, { item_count: number; total_quantity: number; preview_items: Array<Record<string, unknown>> }>();
    for (const item of itemsResult.data ?? []) {
      const current = aggregates.get(item.order_id) ?? { item_count: 0, total_quantity: 0, preview_items: [] };
      current.item_count += 1;
      current.total_quantity += Number(item.quantity);
      if (current.preview_items.length < 3) {
        current.preview_items.push(mapOrderItem(item as OrderItemRow));
      }
      aggregates.set(item.order_id, current);
    }

    return (ordersResult.data ?? []).map((order: OrderRow) => ({
      ...order,
      ...(aggregates.get(order.id) ?? { item_count: 0, total_quantity: 0, preview_items: [] })
    }));
  }

  async function getOrder(id: number): Promise<StoredOrder | undefined> {
    await touchOrderAccess(id);
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

  async function createOrder(input: unknown) {
    const order = orderSchema.parse(input);
    const name = resolveListName(order.companyName, order.name);
    await ensureUniqueOrderName(name);

    const result = await supabase
      .from("orders")
      .insert({
        name,
        company_name: order.companyName.trim(),
        status: order.status,
        last_accessed_at: new Date().toISOString()
      })
      .select("id")
      .single();
    assertNoError(result.error, "Creazione ordine");
    if (!result.data) {
      throw new Error("Creazione ordine: risposta Supabase vuota");
    }
    const orderId = result.data.id;
    await replaceItems(orderId, order.items);
    return getOrder(orderId);
  }

  async function updateOrder(id: number, input: unknown) {
    const order = orderSchema.partial().parse(input);
    const current = await getOrder(id);
    if (!current) return undefined;

    const nextCompanyName = order.companyName?.trim() || current.company_name;
    const nextName = resolveUpdatedListName({
      currentName: current.name,
      currentCompanyName: current.company_name,
      nextCompanyName,
      proposedName: order.name
    });

    await ensureUniqueOrderName(nextName, id);

    const { error } = await supabase
      .from("orders")
      .update({
        name: nextName,
        company_name: nextCompanyName,
        status: order.status ?? current.status,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    assertNoError(error, "Aggiornamento ordine");

    if (order.items) {
      await replaceItems(id, order.items);
    }

    return getOrder(id);
  }

  async function duplicateOrder(id: number) {
    const original = await getOrder(id);
    if (!original) return undefined;
    const existingNames = await listExistingOrderNames();
    const name = buildDuplicateListName(original.name as string, existingNames);

    return createOrder({
      name,
      companyName: original.company_name,
      items: (original.items as Array<Record<string, unknown>>).map((item) => ({
        productId: Number(item.product_id),
        quantity: Number(item.quantity),
        notes: String(item.notes ?? "")
      }))
    });
  }

  async function deleteOrder(id: number) {
    const { error, count } = await supabase.from("orders").delete({ count: "exact" }).eq("id", id);
    assertNoError(error, "Eliminazione ordine");
    return (count ?? 0) > 0;
  }

  async function previousOrderItems() {
    const latestOrdersResult = await supabase
      .from("orders")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(20);
    assertNoError(latestOrdersResult.error, "Lettura ultimi ordini");

    const orderIds = (latestOrdersResult.data ?? []).map((order: { id: number }) => order.id);
    if (!orderIds.length) return [];

    const itemsResult = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, notes, products!inner(name, category, unit)")
      .in("order_id", orderIds)
      .gt("quantity", 0);

    assertNoError(itemsResult.error, "Lettura ultimo dettaglio ordine");

    const latestOrderIdWithItems = orderIds.find((orderId: number) =>
      (itemsResult.data ?? []).some((item: { order_id: number }) => item.order_id === orderId)
    );
    if (!latestOrderIdWithItems) return [];

    return (itemsResult.data ?? [])
      .map((item: {
        order_id: number;
        product_id: number;
        quantity: number;
        notes: string;
        products?: { name: string; category: string; unit: string } | Array<{ name: string; category: string; unit: string }> | null;
      }) => {
        if (item.order_id !== latestOrderIdWithItems) return null;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        return {
          product_id: item.product_id,
          quantity: Number(item.quantity),
          notes: item.notes ?? "",
          name: product?.name ?? "",
          category: product?.category ?? "",
          unit: product?.unit ?? "",
          icon: getProductIcon(item.product_id)
        };
      })
      .filter((item: unknown): item is {
        product_id: number;
        quantity: number;
        notes: string;
        name: string;
        category: string;
        unit: string;
        icon: string;
      } => !!item)
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "it"));
  }

  async function productLastQuantities() {
    const [productsResult, ordersResult, itemsResult] = await Promise.all([
      supabase.from("products").select("id, name").order("name", { ascending: true }),
      supabase.from("orders").select("id, created_at").order("created_at", { ascending: false }),
      supabase.from("order_items").select("order_id, product_id, quantity").gt("quantity", 0)
    ]);

    assertNoError(productsResult.error, "Lettura prodotti per ultime quantità");
    assertNoError(ordersResult.error, "Lettura ordini per ultime quantità");
    assertNoError(itemsResult.error, "Lettura righe per ultime quantità");

    const itemsByOrder = new Map<number, Array<{ product_id: number; quantity: number }>>();

    for (const item of (itemsResult.data ?? []) as Array<{ order_id: number; product_id: number; quantity: number }>) {
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
    const normalizedMap = new Map<number, z.infer<typeof orderItemSchema>>();

    for (const item of items) {
      if (item.quantity <= 0) continue;

      const existing = normalizedMap.get(item.productId);
      if (!existing) {
        normalizedMap.set(item.productId, {
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes ?? ""
        });
        continue;
      }

      normalizedMap.set(item.productId, {
        productId: item.productId,
        quantity: Number((existing.quantity + item.quantity).toFixed(2)),
        notes: item.notes?.trim() ? item.notes : existing.notes
      });
    }

    const normalized = Array.from(normalizedMap.values());
    const productIds = Array.from(normalizedMap.keys());

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
      icon: getProductIcon(item.product_id),
      habitual: toHabitualFlag(product?.habitual)
    };
  }

  async function ensureUniqueOrderName(name: string, excludeId?: number) {
    const existingResult = await supabase.from("orders").select("id, name");
    assertNoError(existingResult.error, "Verifica nome lista");

    const normalizedTarget = name.trim().toLocaleLowerCase("it");
    const duplicate = (existingResult.data ?? []).find((row: { id: number; name: string }) =>
      row.id !== excludeId && row.name.trim().toLocaleLowerCase("it") === normalizedTarget
    );

    if (duplicate) {
      throw new Error("Esiste gia una lista con questo nome");
    }
  }

  async function listExistingOrderNames() {
    const existingResult = await supabase.from("orders").select("name");
    assertNoError(existingResult.error, "Lettura nomi liste");
    return (existingResult.data ?? []).map((row: { name: string }) => row.name);
  }

  async function touchOrderAccess(id: number) {
    const { error } = await supabase
      .from("orders")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", id);

    assertNoError(error, "Aggiornamento ultimo accesso lista");
  }

  return {
    listOrders,
    getOrder,
    createOrder,
    updateOrder,
    duplicateOrder,
    deleteOrder,
    previousOrderItems,
    productLastQuantities
  };
}
