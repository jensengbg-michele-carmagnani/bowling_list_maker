import type { LastQuantity, Order, Product, Settings } from "../types/domain";

const baseUrl = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Errore di rete" }));
    throw new Error(error.message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  products: {
    list: (params = "") => request<Product[]>(`/products${params}`),
    create: (product: Partial<Product>) => request<Product>("/products", { method: "POST", body: JSON.stringify(product) }),
    update: (id: number, product: Partial<Product>) => request<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(product) }),
    remove: (id: number) => request<void>(`/products/${id}`, { method: "DELETE" })
  },
  orders: {
    list: () => request<Order[]>("/orders"),
    get: (id: number) => request<Order>(`/orders/${id}`),
    create: (order: { name: string; items: Array<{ productId: number; quantity: number; notes?: string }> }) =>
      request<Order>("/orders", { method: "POST", body: JSON.stringify(order) }),
    update: (id: number, order: { name?: string; items?: Array<{ productId: number; quantity: number; notes?: string }> }) =>
      request<Order>(`/orders/${id}`, { method: "PUT", body: JSON.stringify(order) }),
    duplicate: (id: number) => request<Order>(`/orders/${id}/duplicate`, { method: "POST" }),
    previous: () => request<Array<{ product_id: number; quantity: number; name: string; category: string; unit: string }>>("/orders/previous"),
    lastQuantities: () => request<LastQuantity[]>("/orders/last-quantities")
  },
  settings: {
    get: () => request<Settings>("/settings"),
    update: (settings: Partial<Settings>) => request<Settings>("/settings", { method: "PUT", body: JSON.stringify(settings) })
  },
  stats: {
    dashboard: () => request<{ totalProducts: number; lastOrder?: Order }>("/stats/dashboard"),
    orders: () => request<{ frequentProducts: Array<Record<string, number | string>>; ordersOverTime: Array<Record<string, number | string>> }>("/stats/orders")
  },
  exportUrl: (orderId: number, format: "pdf" | "xlsx" | "csv") => `${baseUrl}/export/orders/${orderId}/${format}`,
  databaseUrl: () => `${baseUrl}/export/database`,
  importProducts: async (file: File) => upload("/import/products", file),
  restore: async (file: File) => upload("/import/restore", file),
  seedBeverages: () => request<{ totalSeedProducts: number; inserted: number; skipped: number }>("/import/beverage-catalog", { method: "POST" }),
  seedKitchen: () => request<{ totalSeedProducts: number; inserted: number; skipped: number }>("/import/kitchen-catalog", { method: "POST" })
};

async function upload(path: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", body: form });
  if (!response.ok) throw new Error("Caricamento non riuscito");
  return response.json();
}
