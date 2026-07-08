import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { getOrder } from "./orderService";
import { createDataSnapshot } from "./snapshotService";

export async function createCsv(orderId: number) {
  const order = await getOrder(orderId);
  if (!order) return undefined;
  const header = ["Prodotto", "Categoria", "Quantita", "Unita", "Note"];
  const rows = (order.items as Array<Record<string, unknown>>).map((item) => [
    item.name,
    item.category,
    item.quantity,
    item.unit,
    item.notes ?? ""
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export async function createXlsx(orderId: number) {
  const order = await getOrder(orderId);
  if (!order) return undefined;
  const rows = (order.items as Array<Record<string, unknown>>).map((item) => ({
    Prodotto: item.name,
    Categoria: item.category,
    Quantita: item.quantity,
    Unita: item.unit,
    Note: item.notes ?? ""
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Ordine");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function createPdf(orderId: number) {
  const order = await getOrder(orderId);
  if (!order) return undefined;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 44, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text(order.name as string, { underline: true });
    doc.moveDown(0.5).fontSize(10).text(`Creato: ${formatDate(order.created_at as string)}`);
    doc.moveDown(1);

    doc.fontSize(11).text("Prodotto", 44, doc.y, { width: 190, continued: true });
    doc.text("Categoria", { width: 110, continued: true });
    doc.text("Qta", { width: 60, continued: true });
    doc.text("Unita", { width: 80, continued: true });
    doc.text("Note");
    doc.moveTo(44, doc.y + 4).lineTo(550, doc.y + 4).stroke();
    doc.moveDown();

    (order.items as Array<Record<string, unknown>>).forEach((item) => {
      if (doc.y > 740) doc.addPage();
      doc.fontSize(10).text(String(item.name), 44, doc.y, { width: 190, continued: true });
      doc.text(String(item.category), { width: 110, continued: true });
      doc.text(String(item.quantity), { width: 60, continued: true });
      doc.text(String(item.unit), { width: 80, continued: true });
      doc.text(String(item.notes ?? ""), { width: 120 });
      doc.moveDown(0.35);
    });

    doc.end();
  });
}

export async function createBackupJson() {
  const snapshot = await createDataSnapshot();
  return Buffer.from(JSON.stringify(snapshot, null, 2), "utf8");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
