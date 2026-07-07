import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import XLSX from "xlsx";
import { paths } from "../db.js";
import { getOrder } from "./orderService.js";

export function createCsv(orderId: number) {
  const order = getOrder(orderId);
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

export function createXlsx(orderId: number) {
  const order = getOrder(orderId);
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

export function createPdf(orderId: number) {
  const order = getOrder(orderId);
  if (!order) return undefined;
  const filePath = path.join(paths.dataDir, `ordine-${orderId}.pdf`);
  const doc = new PDFDocument({ margin: 44, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

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
    const y = doc.y;
    if (y > 740) doc.addPage();
    doc.fontSize(10).text(String(item.name), 44, doc.y, { width: 190, continued: true });
    doc.text(String(item.category), { width: 110, continued: true });
    doc.text(String(item.quantity), { width: 60, continued: true });
    doc.text(String(item.unit), { width: 80, continued: true });
    doc.text(String(item.notes ?? ""), { width: 120 });
    doc.moveDown(0.35);
  });

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
