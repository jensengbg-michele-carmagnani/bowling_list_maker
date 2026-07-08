export type Product = {
  id: number;
  name: string;
  category: string;
  unit: string;
  notes: string;
  icon: string;
  habitual: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id?: number;
  product_id: number;
  productId?: number;
  name: string;
  category: string;
  unit: string;
  icon?: string;
  quantity: number;
  notes?: string;
  habitual?: 0 | 1;
};

export type Order = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "sent";
  items: OrderItem[];
  preview_items?: OrderItem[];
  item_count?: number;
  total_quantity?: number;
};

export type Settings = {
  businessName: string;
  logo: string;
  preferredExport: "pdf" | "xlsx" | "csv";
  categories: string[];
  units: string[];
};

export type LastQuantity = {
  product_id: number;
  name: string;
  last_quantity: number | null;
  last_order_date: string | null;
};
