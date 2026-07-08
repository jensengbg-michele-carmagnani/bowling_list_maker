import { Router } from "express";
import { createBackupJson, createCsv, createPdf, createXlsx } from "../services/exportService.js";
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
      const pdf = await createPdf(orderId);
      if (!pdf) return res.status(404).json({ message: "Ordine non trovato" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=ordine-${orderId}.pdf`);
      return res.send(pdf);
    }

    return res.status(400).json({ message: "Formato non supportato" });
  })
);

exportsRouter.get("/database", asyncHandler(async (_req, res) => {
  const file = await createBackupJson();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=warehouse-backup.json");
  res.send(file);
}));

exportsRouter.get("/database/json", asyncHandler(async (_req, res) => {
  const file = await createBackupJson();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=warehouse-backup.json");
  res.send(file);
}));
