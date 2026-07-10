import { z } from "zod";
import { getProductIcon } from "../productIcons";
import { assertNoError, supabase, toHabitualFlag } from "../supabase";

export const productSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  notes: z.string().optional().default(""),
  price: z.coerce.number().min(0).optional().default(0),
  habitual: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((value) => value === true || value === 1).optional().default(true)
});

type ProductRow = {
  id: number;
  name: string;
  category: string;
  unit: string;
  notes: string;
  price?: number;
  habitual: boolean;
  created_at: string;
  updated_at: string;
};

export async function listProducts(filters: { search?: string; category?: string; habitual?: string }) {
  let query = supabase.from("products").select("*").order("name", { ascending: true });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.habitual === "true") {
    query = query.eq("habitual", true);
  }

  const { data, error } = await query;
  assertNoError(error, "Lettura prodotti");

  const search = filters.search?.trim().toLowerCase();
  const products = (data ?? []).map(mapProduct);
  if (!search) return products;

  return products.filter((product: ReturnType<typeof mapProduct>) =>
    product.name.toLowerCase().includes(search) || product.notes.toLowerCase().includes(search)
  );
}

export async function createProduct(input: unknown) {
  const product = productSchema.parse(input);
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: product.name,
      category: product.category,
      unit: product.unit,
      notes: product.notes,
      price: product.price,
      habitual: product.habitual
    })
    .select("*")
    .single();

  assertNoError(error, "Creazione prodotto");
  return mapProduct(data);
}

export async function updateProduct(id: number, input: unknown) {
  const product = productSchema.partial().parse(input);
  const current = await getProduct(id);
  if (!current) return undefined;

  const next = {
    name: product.name ?? current.name,
    category: product.category ?? current.category,
    unit: product.unit ?? current.unit,
    notes: product.notes ?? current.notes,
    price: product.price ?? current.price,
    habitual: product.habitual === undefined ? current.habitual === 1 : product.habitual
  };

  const { error } = await supabase
    .from("products")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", id);

  assertNoError(error, "Aggiornamento prodotto");
  return getProduct(id);
}

export async function deleteProduct(id: number) {
  const { error, count } = await supabase.from("products").delete({ count: "exact" }).eq("id", id);
  assertNoError(error, "Eliminazione prodotto");
  return (count ?? 0) > 0;
}

export async function getProduct(id: number) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  assertNoError(error, "Lettura prodotto");
  return data ? mapProduct(data) : undefined;
}

function mapProduct(row: ProductRow) {
  return {
    ...row,
    price: Number(row.price ?? 0),
    icon: getProductIcon(row.id),
    habitual: toHabitualFlag(row.habitual)
  };
}
