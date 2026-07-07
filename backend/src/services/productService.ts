import { z } from "zod";
import { db } from "../db.js";

export const productSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  notes: z.string().optional().default(""),
  habitual: z.boolean().optional().default(true)
});

export function listProducts(filters: { search?: string; category?: string; habitual?: string }) {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.search) {
    where.push("(name LIKE @search OR notes LIKE @search)");
    params.search = `%${filters.search}%`;
  }
  if (filters.category) {
    where.push("category = @category");
    params.category = filters.category;
  }
  if (filters.habitual === "true") {
    where.push("habitual = 1");
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM products ${clause} ORDER BY name COLLATE NOCASE ASC`)
    .all(params);
}

export function createProduct(input: unknown) {
  const product = productSchema.parse(input);
  const result = db
    .prepare(
      `INSERT INTO products (name, category, unit, notes, habitual)
       VALUES (@name, @category, @unit, @notes, @habitual)`
    )
    .run({ ...product, habitual: product.habitual ? 1 : 0 });
  return getProduct(Number(result.lastInsertRowid));
}

export function updateProduct(id: number, input: unknown) {
  const product = productSchema.partial().parse(input);
  const current = getProduct(id) as Record<string, unknown> | undefined;
  if (!current) return undefined;

  const next = {
    name: product.name ?? current.name,
    category: product.category ?? current.category,
    unit: product.unit ?? current.unit,
    notes: product.notes ?? current.notes,
    habitual: product.habitual === undefined ? current.habitual : product.habitual ? 1 : 0,
    id
  };

  db.prepare(
    `UPDATE products
     SET name = @name, category = @category, unit = @unit, notes = @notes,
         habitual = @habitual, updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`
  ).run(next);
  return getProduct(id);
}

export function deleteProduct(id: number) {
  return db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0;
}

export function getProduct(id: number) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
}
