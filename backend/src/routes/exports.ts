import fs from "node:fs";
import { Router } from "express";
import { paths } from "../db.js";
import { createCsv, createPdf, createXlsx } from "../services/exportService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const exportsRouter = Router();

exportsRouter.get(
  "/orders/:id/:format",
  asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const format = req.params.format;

    if (format === "csv") {
      const csv = createCsv(orderId);
      if (!csv) return res.status(404).json({ message: "Ordine non trovato" });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=ordine-${orderId}.csv`);
      return res.send(csv);
    }

    if (format === "xlsx") {
      const xlsx = createXlsx(orderId);
      if (!xlsx) return res.status(404).json({ message: "Ordine non trovato" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=ordine-${orderId}.xlsx`);
      return res.send(xlsx);
    }

    if (format === "pdf") {
      const pdfPath = await createPdf(orderId);
      if (!pdfPath) return res.status(404).json({ message: "Ordine non trovato" });
      return res.download(pdfPath, `ordine-${orderId}.pdf`);
    }

    return res.status(400).json({ message: "Formato non supportato" });
  })
);

exportsRouter.get("/database", (_req, res) => {
  res.download(paths.dbPath, "warehouse-backup.sqlite");
});

exportsRouter.get("/database/json", (_req, res) => {
  const file = fs.readFileSync(paths.dbPath);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=warehouse-database.sqlite");
  res.send(file);
});
