import multer from "multer";
import { Router } from "express";
import XLSX from "xlsx";
import { createProduct } from "../services/productService.js";
import { restoreDataSnapshot } from "../services/snapshotService.js";
import { seedBeverageCatalog, seedKitchenCatalog } from "../services/seedService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage() });
export const importsRouter = Router();

importsRouter.post(
  "/products",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File mancante" });
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const imported = [];

    for (const row of rows) {
      const name = String(row.Nome ?? row.name ?? "").trim();
      if (!name) continue;
      try {
        const product = await createProduct({
            name,
            category: String(row.Categoria ?? row.category ?? "Altro"),
            unit: String(row.Unita ?? row.unit ?? row["Unità"] ?? "pezzi"),
            notes: String(row.Note ?? row.notes ?? ""),
            habitual: true
          });
        imported.push(product);
      } catch {
        // I duplicati vengono ignorati per rendere l'import rapido e ripetibile.
      }
    }

    return res.json({ imported: imported.length });
  })
);

importsRouter.post(
  "/restore",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File mancante" });
    const content = JSON.parse(req.file.buffer.toString("utf8"));
    return res.json(await restoreDataSnapshot(content));
  })
);

importsRouter.post(
  "/beverage-catalog",
  asyncHandler(async (_req, res) => {
    res.json(await seedBeverageCatalog());
  })
);

importsRouter.post(
  "/kitchen-catalog",
  asyncHandler(async (_req, res) => {
    res.json(await seedKitchenCatalog());
  })
);
