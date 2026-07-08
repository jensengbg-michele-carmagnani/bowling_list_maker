import cors from "cors";
import express from "express";
import helmet from "helmet";
import { exportsRouter } from "./routes/exports.js";
import { importsRouter } from "./routes/imports.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { settingsRouter } from "./routes/settings.js";
import { statsRouter } from "./routes/stats.js";
import { ensureDefaultSettings } from "./supabase.js";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? true }));
  app.use(express.json({ limit: "8mb" }));
  app.use("/api", (_req, _res, next) => {
    ensureDefaultSettings().then(() => next()).catch(next);
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/export", exportsRouter);
  app.use("/api/import", importsRouter);

  return app;
}

export function registerErrorHandler(app: express.Express) {
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Errore inatteso";
    res.status(400).json({ message });
  });
}
