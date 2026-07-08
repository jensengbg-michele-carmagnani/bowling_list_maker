import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type IconCatalogEntry = {
  id: number;
  svg: string;
};

type IconCatalogFile = {
  products?: IconCatalogEntry[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "public", "product-icons", "catalog.json");
const fallbackIconPath = "/product-icons/generic.svg";

let iconMap: Map<number, string> | null = null;

export function getProductIcon(productId: number) {
  return loadIconMap().get(productId) ?? fallbackIconPath;
}

function loadIconMap() {
  if (iconMap) return iconMap;

  try {
    const raw = fs.readFileSync(catalogPath, "utf8");
    const parsed = JSON.parse(raw) as IconCatalogFile;
    iconMap = new Map((parsed.products ?? []).map((product) => [product.id, product.svg]));
  } catch {
    iconMap = new Map();
  }

  return iconMap;
}
