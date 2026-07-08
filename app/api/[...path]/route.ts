import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withApiHandler } from "@/server/route-handler";
import { createOrder, deleteOrder, duplicateOrder, getOrder, listOrders, previousOrderItems, productLastQuantities, updateOrder } from "@/server/services/orderService";
import { createProduct, deleteProduct, listProducts, updateProduct } from "@/server/services/productService";
import { seedBeverageCatalog, seedKitchenCatalog } from "@/server/services/seedService";
import { getSettings, updateSettings } from "@/server/services/settingsService";
import { restoreDataSnapshot } from "@/server/services/snapshotService";
import { dashboardStats, orderStats } from "@/server/services/statsService";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path ?? [];

  if (isPath(path, ["health"])) {
    return NextResponse.json({ ok: true });
  }

  if (isPath(path, ["products"])) {
    return withApiHandler(() =>
      listProducts({
        search: request.nextUrl.searchParams.get("search") ?? undefined,
        category: request.nextUrl.searchParams.get("category") ?? undefined,
        habitual: request.nextUrl.searchParams.get("habitual") ?? undefined
      })
    );
  }

  if (isPath(path, ["orders"])) {
    return withApiHandler(() => listOrders());
  }

  if (isPath(path, ["orders", "previous"])) {
    return withApiHandler(() => previousOrderItems());
  }

  if (isPath(path, ["orders", "last-quantities"])) {
    return withApiHandler(() => productLastQuantities());
  }

  if (path[0] === "orders" && path.length === 2 && isNumeric(path[1])) {
    return withApiHandler(async () => {
      const order = await getOrder(Number(path[1]));
      if (!order) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
      return order;
    });
  }

  if (isPath(path, ["settings"])) {
    return withApiHandler(() => getSettings());
  }

  if (isPath(path, ["stats", "dashboard"])) {
    return withApiHandler(() => dashboardStats());
  }

  if (isPath(path, ["stats", "orders"])) {
    return withApiHandler(() => orderStats());
  }

  if (path[0] === "export" && path[1] === "orders" && path.length === 4 && isNumeric(path[2])) {
    const orderId = Number(path[2]);
    const format = path[3];
    return withApiHandler(async () => {
      const { createCsv, createPdf, createXlsx } = await import("@/server/services/exportService");

      if (format === "csv") {
        const csv = await createCsv(orderId);
        if (!csv) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename=ordine-${orderId}.csv`
          }
        });
      }

      if (format === "xlsx") {
        const xlsx = await createXlsx(orderId);
        if (!xlsx) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
        return new Response(new Uint8Array(xlsx), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=ordine-${orderId}.xlsx`
          }
        });
      }

      if (format === "pdf") {
        const pdf = await createPdf(orderId);
        if (!pdf) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
        return new Response(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=ordine-${orderId}.pdf`
          }
        });
      }

      return NextResponse.json({ message: "Formato non supportato" }, { status: 400 });
    });
  }

  if (
    isPath(path, ["export", "database"]) ||
    isPath(path, ["export", "database", "json"])
  ) {
    return withApiHandler(async () => {
      const { createBackupJson } = await import("@/server/services/exportService");
      const file = await createBackupJson();
      return new Response(file, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "attachment; filename=warehouse-backup.json"
        }
      });
    });
  }

  return NextResponse.json({ message: "Endpoint non trovato" }, { status: 404 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path ?? [];

  if (isPath(path, ["products"])) {
    return withApiHandler(async () => {
      const body = await request.json();
      return createProduct(body);
    }, { status: 201 });
  }

  if (isPath(path, ["orders"])) {
    return withApiHandler(async () => {
      const body = await request.json();
      return createOrder(body);
    }, { status: 201 });
  }

  if (path[0] === "orders" && path.length === 3 && isNumeric(path[1]) && path[2] === "duplicate") {
    return withApiHandler(async () => {
      const order = await duplicateOrder(Number(path[1]));
      if (!order) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
      return NextResponse.json(order, { status: 201 });
    });
  }

  if (isPath(path, ["import", "products"])) {
    return withApiHandler(async () => {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ message: "File mancante" }, { status: 400 });
      }

      const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      let imported = 0;

      for (const row of rows) {
        const name = String(row.Nome ?? row.name ?? "").trim();
        if (!name) continue;
        try {
          await createProduct({
            name,
            category: String(row.Categoria ?? row.category ?? "Altro"),
            unit: String(row.Unita ?? row.unit ?? row["Unità"] ?? "pezzi"),
            notes: String(row.Note ?? row.notes ?? ""),
            habitual: true
          });
          imported += 1;
        } catch {
          // Ignora i duplicati per mantenere l'import ripetibile.
        }
      }

      return { imported };
    });
  }

  if (isPath(path, ["import", "restore"])) {
    return withApiHandler(async () => {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ message: "File mancante" }, { status: 400 });
      }

      const content = JSON.parse(Buffer.from(await file.arrayBuffer()).toString("utf8"));
      return restoreDataSnapshot(content);
    });
  }

  if (isPath(path, ["import", "beverage-catalog"])) {
    return withApiHandler(() => seedBeverageCatalog());
  }

  if (isPath(path, ["import", "kitchen-catalog"])) {
    return withApiHandler(() => seedKitchenCatalog());
  }

  return NextResponse.json({ message: "Endpoint non trovato" }, { status: 404 });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path ?? [];

  if (path[0] === "products" && path.length === 2 && isNumeric(path[1])) {
    return withApiHandler(async () => {
      const body = await request.json();
      const product = await updateProduct(Number(path[1]), body);
      if (!product) return NextResponse.json({ message: "Prodotto non trovato" }, { status: 404 });
      return product;
    });
  }

  if (path[0] === "orders" && path.length === 2 && isNumeric(path[1])) {
    return withApiHandler(async () => {
      const body = await request.json();
      const order = await updateOrder(Number(path[1]), body);
      if (!order) return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
      return order;
    });
  }

  if (isPath(path, ["settings"])) {
    return withApiHandler(async () => {
      const body = await request.json();
      return updateSettings(body);
    });
  }

  return NextResponse.json({ message: "Endpoint non trovato" }, { status: 404 });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const path = (await context.params).path ?? [];

  if (path[0] === "products" && path.length === 2 && isNumeric(path[1])) {
    return withApiHandler(async () => {
      if (!(await deleteProduct(Number(path[1])))) {
        return NextResponse.json({ message: "Prodotto non trovato" }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    });
  }

  if (path[0] === "orders" && path.length === 2 && isNumeric(path[1])) {
    return withApiHandler(async () => {
      if (!(await deleteOrder(Number(path[1])))) {
        return NextResponse.json({ message: "Ordine non trovato" }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    });
  }

  return NextResponse.json({ message: "Endpoint non trovato" }, { status: 404 });
}

function isPath(path: string[], expected: string[]) {
  return path.length === expected.length && expected.every((segment, index) => path[index] === segment);
}

function isNumeric(value: string | undefined) {
  return !!value && Number.isFinite(Number(value));
}
