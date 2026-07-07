import { z } from "zod";
import { db } from "../db.js";

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

export function listOrders() {
  return db
    .prepare(
      `SELECT o.*,
              COUNT(CASE WHEN oi.quantity > 0 THEN 1 END) AS item_count,
              COALESCE(SUM(CASE WHEN oi.quantity > 0 THEN oi.quantity ELSE 0 END), 0) AS total_quantity
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    .all();
}

export function getOrder(id: number): StoredOrder | undefined {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!order) return undefined;

  const items = db
    .prepare(
      `SELECT oi.*, p.name, p.category, p.unit, p.habitual
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND oi.quantity > 0
       ORDER BY p.name COLLATE NOCASE ASC`
    )
    .all(id);

  return { ...order, items } as StoredOrder;
}

export function createOrder(input: unknown) {
  const order = orderSchema.parse(input);
  const tx = db.transaction(() => {
    const result = db.prepare("INSERT INTO orders (name) VALUES (?)").run(order.name);
    const orderId = Number(result.lastInsertRowid);
    replaceItems(orderId, order.items);
    return getOrder(orderId);
  });
  return tx();
}

export function updateOrder(id: number, input: unknown) {
  const order = orderSchema.partial().parse(input);
  const current = getOrder(id);
  if (!current) return undefined;

  const tx = db.transaction(() => {
    if (order.name) {
      db.prepare("UPDATE orders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.name, id);
    } else {
      db.prepare("UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    }
    if (order.items) replaceItems(id, order.items);
    return getOrder(id);
  });

  return tx();
}

export function duplicateOrder(id: number) {
  const original = getOrder(id);
  if (!original) return undefined;
  const name = `${original.name as string} - copia`;
  return createOrder({ name, items: (original.items as Array<Record<string, unknown>>).map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
    notes: item.notes ?? ""
  })) });
}

export function deleteOrder(id: number) {
  return db.prepare("DELETE FROM orders WHERE id = ?").run(id).changes > 0;
}

export function previousOrderItems() {
  const order = db.prepare("SELECT id FROM orders ORDER BY created_at DESC LIMIT 1").get() as { id: number } | undefined;
  if (!order) return [];
  return db
    .prepare(
      `SELECT oi.product_id, oi.quantity, oi.notes, p.name, p.category, p.unit
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND oi.quantity > 0
       ORDER BY p.name COLLATE NOCASE ASC`
    )
    .all(order.id);
}

export function productLastQuantities() {
  return db
    .prepare(
      `SELECT p.id AS product_id,
              p.name,
              (
                SELECT oi.quantity
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE oi.product_id = p.id AND oi.quantity > 0
                ORDER BY o.created_at DESC
                LIMIT 1
              ) AS last_quantity,
              (
                SELECT o.created_at
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE oi.product_id = p.id AND oi.quantity > 0
                ORDER BY o.created_at DESC
                LIMIT 1
              ) AS last_order_date
       FROM products p`
    )
    .all();
}

function replaceItems(orderId: number, items: Array<z.infer<typeof orderItemSchema>>) {
  db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
  const insert = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, notes)
     VALUES (@orderId, @productId, @quantity, @notes)`
  );

  items.filter((item) => item.quantity > 0).forEach((item) => insert.run({ ...item, orderId }));
}
