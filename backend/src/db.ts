import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const databaseDir = path.join(rootDir, "database");
const isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const dataDir = process.env.DATA_DIR ?? (isVercelRuntime ? path.join("/tmp", "bowling-list-maker") : path.join(databaseDir, "data"));
const dbPath = process.env.DB_PATH ?? path.join(dataDir, "warehouse.sqlite");
const schemaPath = path.join(databaseDir, "schema.sql");

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

const defaults = [
  ["businessName", "Magazzino"],
  ["preferredExport", "pdf"],
  ["categories", JSON.stringify(["Bevande", "Alimentari", "Pulizia", "Monouso", "Altro"])],
  ["units", JSON.stringify(["pezzi", "kg", "litri", "confezioni"])],
  ["logo", ""]
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
defaults.forEach(([key, value]) => insertSetting.run(key, value));

export const paths = { rootDir, databaseDir, dataDir, dbPath };
