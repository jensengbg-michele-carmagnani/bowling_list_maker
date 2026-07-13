type ProductRow = {
  id: number;
  name: string;
  category: string;
  unit: string;
  notes?: string;
  habitual?: boolean;
};

type OrderRow = {
  id: number;
  name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  status: "draft" | "sent" | "received";
};

type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  notes: string;
};

type DatabaseState = {
  products: ProductRow[];
  orders: OrderRow[];
  order_items: OrderItemRow[];
  settings: Array<Record<string, unknown>>;
};

type Filter = (row: Record<string, unknown>) => boolean;

export function createFakeSupabase(seed?: Partial<DatabaseState>) {
  const db: DatabaseState = {
    products: [
      { id: 1, name: "Acqua", category: "Bevande", unit: "bottiglie", notes: "", habitual: true },
      { id: 2, name: "Farina", category: "Alimentari", unit: "kg", notes: "", habitual: true },
      { id: 3, name: "Piatti", category: "Monouso", unit: "pezzi", notes: "", habitual: false }
    ],
    orders: [],
    order_items: [],
    settings: [],
    ...seed
  };

  let clock = Date.parse("2026-01-01T09:00:00.000Z");

  function nextIso() {
    clock += 60_000;
    return new Date(clock).toISOString();
  }

  function nextId(table: keyof DatabaseState) {
    const rows = db[table] as Array<{ id?: number }>;
    return rows.reduce((max, row) => Math.max(max, Number(row.id ?? 0)), 0) + 1;
  }

  class QueryBuilder {
    private operation: "select" | "insert" | "update" | "delete" = "select";
    private selectedColumns = "*";
    private filters: Filter[] = [];
    private orderField: string | null = null;
    private orderAscending = true;
    private limitCount: number | null = null;
    private payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
    private expectSingle: "single" | "maybeSingle" | null = null;
    private deleteOptions: { count?: "exact" } | undefined;

    constructor(private readonly table: keyof DatabaseState) {}

    select(columns = "*") {
      this.selectedColumns = columns;
      return this;
    }

    insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      this.operation = "insert";
      this.payload = payload;
      return this;
    }

    update(payload: Record<string, unknown>) {
      this.operation = "update";
      this.payload = payload;
      return this;
    }

    delete(options?: { count?: "exact" }) {
      this.operation = "delete";
      this.deleteOptions = options;
      return this;
    }

    eq(field: string, value: unknown) {
      this.filters.push((row) => row[field] === value);
      return this;
    }

    neq(field: string, value: unknown) {
      this.filters.push((row) => row[field] !== value);
      return this;
    }

    gt(field: string, value: number) {
      this.filters.push((row) => Number(row[field] ?? 0) > value);
      return this;
    }

    in(field: string, values: unknown[]) {
      this.filters.push((row) => values.includes(row[field]));
      return this;
    }

    ilike(field: string, pattern: string) {
      const regex = new RegExp(`^${escapeLikePattern(pattern).replaceAll("%", ".*").replaceAll("_", ".")}$`, "i");
      this.filters.push((row) => regex.test(String(row[field] ?? "")));
      return this;
    }

    order(field: string, options?: { ascending?: boolean }) {
      this.orderField = field;
      this.orderAscending = options?.ascending ?? true;
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    single() {
      this.expectSingle = "single";
      return this;
    }

    maybeSingle() {
      this.expectSingle = "maybeSingle";
      return this;
    }

    then<TResult1 = Awaited<ReturnType<QueryBuilder["execute"]>>, TResult2 = never>(
      onfulfilled?: ((value: Awaited<ReturnType<QueryBuilder["execute"]>>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return this.execute().then(onfulfilled, onrejected);
    }

    private async execute() {
      switch (this.operation) {
        case "insert":
          return this.executeInsert();
        case "update":
          return this.executeUpdate();
        case "delete":
          return this.executeDelete();
        case "select":
        default:
          return this.executeSelect();
      }
    }

    private executeSelect() {
      let rows = [...(db[this.table] as Array<Record<string, unknown>>)].filter((row) => this.filters.every((filter) => filter(row)));

      if (this.orderField) {
        const field = this.orderField;
        const direction = this.orderAscending ? 1 : -1;
        rows = rows.sort((left, right) => compareValues(left[field], right[field]) * direction);
      }

      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      const data = rows.map((row) => this.projectRow(row));
      return finalizeResult(data, this.expectSingle);
    }

    private executeInsert() {
      const payload = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted = payload.map((row) => {
        if (this.table === "orders") {
          const timestamp = nextIso();
          const order: OrderRow = {
            id: nextId("orders"),
            name: String(row.name ?? ""),
            company_name: String(row.company_name ?? ""),
            created_at: String(row.created_at ?? timestamp),
            updated_at: String(row.updated_at ?? timestamp),
            last_accessed_at: String(row.last_accessed_at ?? timestamp),
            status: (row.status as OrderRow["status"] | undefined) ?? "draft"
          };
          db.orders.push(order);
          return order as Record<string, unknown>;
        }

        if (this.table === "order_items") {
          const item: OrderItemRow = {
            id: nextId("order_items"),
            order_id: Number(row.order_id),
            product_id: Number(row.product_id),
            quantity: Number(row.quantity ?? 0),
            notes: String(row.notes ?? "")
          };
          db.order_items.push(item);
          return item as Record<string, unknown>;
        }

        const product = {
          id: nextId("products"),
          ...row
        } as Record<string, unknown>;
        (db[this.table] as Array<Record<string, unknown>>).push(product);
        return product;
      });

      const data = inserted.map((row) => this.projectRow(row));
      return finalizeResult(data, this.expectSingle);
    }

    private executeUpdate() {
      const rows = (db[this.table] as Array<Record<string, unknown>>).filter((row) => this.filters.every((filter) => filter(row)));
      const payload = this.payload as Record<string, unknown>;

      for (const row of rows) {
        Object.assign(row, payload);
      }

      const data = rows.map((row) => this.projectRow(row));
      return finalizeResult(data, this.expectSingle);
    }

    private executeDelete() {
      const rows = db[this.table] as Array<Record<string, unknown>>;
      const remaining: Array<Record<string, unknown>> = [];
      let deletedCount = 0;

      for (const row of rows) {
        if (this.filters.every((filter) => filter(row))) {
          deletedCount += 1;
          if (this.table === "orders") {
            db.order_items = db.order_items.filter((item) => item.order_id !== Number(row.id));
          }
          continue;
        }
        remaining.push(row);
      }

      db[this.table] = remaining as never;

      return {
        data: null,
        error: null,
        count: this.deleteOptions?.count === "exact" ? deletedCount : null
      };
    }

    private projectRow(row: Record<string, unknown>) {
      if (this.table === "order_items" && this.selectedColumns.includes("products")) {
        const product = db.products.find((item) => item.id === Number(row.product_id));
        return {
          ...row,
          products: product
            ? {
                id: product.id,
                name: product.name,
                category: product.category,
                unit: product.unit,
                habitual: !!product.habitual
              }
            : null
        };
      }

      if (this.selectedColumns === "*") {
        return { ...row };
      }

      const fields = this.selectedColumns
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value && !value.includes("(") && !value.includes("!"));

      if (!fields.length) {
        return { ...row };
      }

      return Object.fromEntries(fields.map((field) => [field, row[field]]));
    }
  }

  return {
    db,
    supabase: {
      from(table: string) {
        return new QueryBuilder(table as keyof DatabaseState);
      },
      async rpc(name: string) {
        if (name === "reset_identity_sequences") {
          return { data: true, error: null };
        }
        return { data: null, error: { message: `RPC non supportata: ${name}` } };
      }
    }
  };
}

function finalizeResult(data: Array<Record<string, unknown>>, mode: "single" | "maybeSingle" | null) {
  if (mode === "single") {
    return {
      data: data[0] ?? null,
      error: data.length ? null : { message: "Nessun record trovato" }
    };
  }

  if (mode === "maybeSingle") {
    return {
      data: data[0] ?? null,
      error: data.length > 1 ? { message: "Trovati piu record" } : null
    };
  }

  return { data, error: null };
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left ?? "").localeCompare(String(right ?? ""), "it", { sensitivity: "base" });
}

function escapeLikePattern(pattern: string) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
