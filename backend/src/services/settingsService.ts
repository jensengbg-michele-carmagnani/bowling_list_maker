import { z } from "zod";
import { db } from "../db.js";

const settingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  logo: z.string().optional(),
  preferredExport: z.enum(["pdf", "xlsx", "csv"]).optional(),
  categories: z.array(z.string().min(1)).optional(),
  units: z.array(z.string().min(1)).optional()
});

export function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  return rows.reduce<Record<string, unknown>>((acc, row) => {
    try {
      acc[row.key] = JSON.parse(row.value);
    } catch {
      acc[row.key] = row.value;
    }
    return acc;
  }, {});
}

export function updateSettings(input: unknown) {
  const settings = settingsSchema.parse(input);
  const stmt = db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );

  Object.entries(settings).forEach(([key, value]) => {
    stmt.run({ key, value: typeof value === "string" ? value : JSON.stringify(value) });
  });

  return getSettings();
}
