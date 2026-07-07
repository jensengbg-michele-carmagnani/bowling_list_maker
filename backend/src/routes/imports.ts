import fs from "node:fs";
import multer from "multer";
import { Router } from "express";
import XLSX from "xlsx";
import { paths } from "../db.js";
import { createProduct } from "../services/productService.js";
import { seedBeverageCatalog, seedKitchenCatalog } from "../services/seedService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const upload = multer({ dest: paths.dataDir });
export const importsRouter = Router();

importsRouter.post(
  "/products",
  upload.single("file"),
  asyncHandler((req, res) => {
    if (!req.file) return res.status(400).json({ message: "File mancante" });
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const imported = [];

    for (const row of rows) {
      const name = String(row.Nome ?? row.name ?? "").trim();
      if (!name) continue;
      try {
        imported.push(
          createProduct({
            name,
            category: String(row.Categoria ?? row.category ?? "Altro"),
            unit: String(row.Unita ?? row.unit ?? row["Unità"] ?? "pezzi"),
            notes: String(row.Note ?? row.notes ?? ""),
            habitual: true
          })
        );
      } catch {
        // I duplicati vengono ignorati per rendere l'import rapido e ripetibile.
      }
    }

    fs.unlink(req.file.path, () => undefined);
    return res.json({ imported: imported.length });
  })
);

importsRouter.post(
  "/restore",
  upload.single("file"),
  asyncHandler((req, res) => {
    if (!req.file) return res.status(400).json({ message: "File mancante" });
    fs.copyFileSync(req.file.path, paths.dbPath);
    fs.unlink(req.file.path, () => undefined);
    return res.json({ restored: true });
  })
);

importsRouter.post(
  "/beverage-catalog",
  asyncHandler((_req, res) => {
    res.json(seedBeverageCatalog());
  })
);

importsRouter.post(
  "/kitchen-catalog",
  asyncHandler((_req, res) => {
    res.json(seedKitchenCatalog());
  })
);
