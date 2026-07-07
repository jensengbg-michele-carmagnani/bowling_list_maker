import { db } from "../db.js";

export function dashboardStats() {
  const totalProducts = db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number };
  const lastOrder = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 1").get();
  return {
    totalProducts: totalProducts.count,
    lastOrder
  };
}

export function orderStats() {
  const frequentProducts = db
    .prepare(
      `SELECT p.name, p.category, p.unit,
              COUNT(oi.id) AS times_ordered,
              SUM(oi.quantity) AS total_quantity
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.quantity > 0
       GROUP BY p.id
       ORDER BY times_ordered DESC, total_quantity DESC
       LIMIT 12`
    )
    .all();

  const ordersOverTime = db
    .prepare(
      `SELECT substr(o.created_at, 1, 10) AS date,
              COUNT(DISTINCT o.id) AS orders,
              SUM(oi.quantity) AS quantity
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY substr(o.created_at, 1, 10)
       ORDER BY date ASC`
    )
    .all();

  return { frequentProducts, ordersOverTime };
}
