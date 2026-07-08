import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { listProducts } from "../services/productService";

type Product = Awaited<ReturnType<typeof listProducts>>[number];

type Palette = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
};

type CategoryStyle = {
  palette: Palette;
  baseGlyph: (palette: Palette) => string;
};

type DetailGlyph = {
  label: string;
  draw: (palette: Palette) => string;
};

type IconManifestEntry = {
  id: number;
  name: string;
  slug: string;
  category: string;
  unit: string;
  notes: string;
  initials: string;
  detail: string;
  svg: string;
  png72: string;
  png300: string;
  svgBytes: number;
  png72Bytes: number;
  png300Bytes: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const outputRoot = path.join(rootDir, "public", "product-icons");
const svgDir = path.join(outputRoot, "svg");
const png72Dir = path.join(outputRoot, "png-72dpi");
const png300Dir = path.join(outputRoot, "png-300dpi");
const docsDir = path.join(rootDir, "docs");
const docsFile = path.join(docsDir, "product-icon-catalog.md");
const manifestFile = path.join(outputRoot, "catalog.json");
const htmlFile = path.join(outputRoot, "catalog.html");

const basePalette = {
  ink: "#172033",
  leaf: "#0F766E",
  amber: "#F59E0B",
  sky: "#2563EB",
  plum: "#7C3AED",
  berry: "#BE185D",
  coral: "#EA580C",
  lime: "#65A30D",
  slate: "#475569",
  cream: "#FFF7ED"
};

const categoryStyles: Record<string, CategoryStyle> = {
  Acqua: {
    palette: makePalette("#0EA5E9"),
    baseGlyph: drawBottle
  },
  Alimentari: {
    palette: makePalette("#F97316"),
    baseGlyph: drawPlateCover
  },
  Amari: {
    palette: makePalette("#A16207"),
    baseGlyph: drawBottle
  },
  Aperitivi: {
    palette: makePalette("#DC2626"),
    baseGlyph: drawAperitifGlass
  },
  "Aperitivi analcolici": {
    palette: makePalette("#EC4899"),
    baseGlyph: drawSparklingGlass
  },
  Bibite: {
    palette: makePalette("#2563EB"),
    baseGlyph: drawCan
  },
  Birre: {
    palette: makePalette("#CA8A04"),
    baseGlyph: drawBeerGlass
  },
  "Energy drink": {
    palette: makePalette("#7C3AED"),
    baseGlyph: drawCan
  },
  Gin: {
    palette: makePalette("#059669"),
    baseGlyph: drawBottle
  },
  Liquori: {
    palette: makePalette("#9333EA"),
    baseGlyph: drawBottle
  },
  Mixer: {
    palette: makePalette("#14B8A6"),
    baseGlyph: drawHighballGlass
  },
  Monouso: {
    palette: makePalette("#64748B"),
    baseGlyph: drawFoldedPaper
  },
  Rum: {
    palette: makePalette("#B45309"),
    baseGlyph: drawBottle
  },
  Succhi: {
    palette: makePalette("#F97316"),
    baseGlyph: drawCarton
  },
  "Tequila e mezcal": {
    palette: makePalette("#84CC16"),
    baseGlyph: drawBottle
  },
  Vermouth: {
    palette: makePalette("#B91C1C"),
    baseGlyph: drawBottle
  },
  "Vini e bollicine": {
    palette: makePalette("#BE185D"),
    baseGlyph: drawWineBottle
  },
  Vodka: {
    palette: makePalette("#0284C7"),
    baseGlyph: drawBottle
  },
  Whisky: {
    palette: makePalette("#92400E"),
    baseGlyph: drawBottle
  }
};

const keywordGlyphs: Array<{ label: string; matches: RegExp[]; draw: DetailGlyph["draw"] }> = [
  { label: "citrus", matches: [/\blimon/i, /\blemon/i, /\baranc/i, /\baperol\b/i, /\bcampari\b/i, /\bpompelm/i], draw: drawCitrusSlice },
  { label: "berries", matches: [/mirtill/i, /cranberry/i, /berry/i], draw: drawBerryCluster },
  { label: "tropical", matches: [/ananas/i, /tropical/i, /ace/i, /pesca/i, /pera/i, /mela/i, /albicocca/i], draw: drawLeafSprig },
  { label: "spark", matches: [/energy/i, /red bull/i, /cola/i, /chinotto/i], draw: drawBolt },
  { label: "bubbles", matches: [/frizzante/i, /tonica/i, /soda/i, /sparkling/i, /acqua/i, /water/i], draw: drawBubbles },
  { label: "agave", matches: [/tequila/i, /mezcal/i], draw: drawAgave },
  { label: "juniper", matches: [/\bgin\b/i], draw: drawJuniper },
  { label: "grape", matches: [/vino/i, /prosecco/i, /rose/i, /bollicin/i], draw: drawGrapes },
  { label: "hop", matches: [/birra/i, /lager/i, /ipa/i, /pils/i], draw: drawHop },
  { label: "flame", matches: [/piccant/i, /spiced/i, /hot/i, /dark/i, /black/i], draw: drawFlame },
  { label: "paper", matches: [/\bpiatti/i, /\bbicchier/i, /\btovagli/i, /\bcannucc/i, /\bcoltell/i, /\bcucchiai/i, /\bforchett/i, /\bguanti/i], draw: drawPaperFold },
  { label: "bread", matches: [/pane/i, /pinsa/i, /piadina/i, /toast/i, /club/i], draw: drawGrain },
  { label: "cheese", matches: [/scamorza/i, /mozzarella/i, /formaggio/i], draw: drawCheese },
  { label: "tomato", matches: [/pomodoro/i], draw: drawTomato },
  { label: "leaf", matches: [/rucola/i, /insalata/i, /basilico/i], draw: drawLeaf },
  { label: "charcuterie", matches: [/prosciutto/i, /salame/i, /speck/i], draw: drawCharcuterie },
  { label: "sauce", matches: [/salsa/i, /senape/i, /maionese/i], draw: drawSauceSwirl }
];

const unitBadges: Record<string, string> = {
  bottiglie: "BTL",
  confezioni: "PK",
  kg: "KG",
  litri: "L",
  pezzi: "PC"
};

async function main() {
  const products = await listProducts({});

  recreateDir(svgDir);
  recreateDir(png72Dir);
  recreateDir(png300Dir);
  fs.mkdirSync(docsDir, { recursive: true });

  const manifest: IconManifestEntry[] = [];

  for (const product of products) {
    const slug = `${slugify(product.name)}-${product.id}`;
    const svgFile = path.join(svgDir, `${slug}.svg`);
    const png72File = path.join(png72Dir, `${slug}.png`);
    const png300File = path.join(png300Dir, `${slug}.png`);

    const svg = buildIcon(product);
    fs.writeFileSync(svgFile, svg, "utf8");

    await sharp(Buffer.from(svg))
      .resize(256, 256)
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 72 })
      .toFile(png72File);

    await sharp(Buffer.from(svg), { density: 300 })
      .resize(1200, 1200)
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 300 })
      .toFile(png300File);

    const detail = pickDetailGlyph(product).label;
    manifest.push({
      id: product.id,
      name: product.name,
      slug,
      category: product.category,
      unit: product.unit,
      notes: product.notes,
      initials: getInitials(product.name),
      detail,
      svg: toPublicPath(svgFile),
      png72: toPublicPath(png72File),
      png300: toPublicPath(png300File),
      svgBytes: fs.statSync(svgFile).size,
      png72Bytes: fs.statSync(png72File).size,
      png300Bytes: fs.statSync(png300File).size
    });
  }

  fs.writeFileSync(manifestFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: manifest.length,
    style: {
      description: "Set coerente brand-first con silhouette per categoria, dettaglio prodotto, monogramma e firma geometrica.",
      strokeWidth: 10,
      viewBox: "0 0 256 256"
    },
    products: manifest
  }, null, 2));

  fs.writeFileSync(docsFile, buildMarkdownCatalog(manifest), "utf8");
  fs.writeFileSync(htmlFile, buildHtmlCatalog(manifest), "utf8");

  const oversized = manifest.filter((entry) => entry.svgBytes > 50 * 1024);
  console.log(JSON.stringify({
    generated: manifest.length,
    svgDir: toPublicPath(svgDir),
    png72Dir: toPublicPath(png72Dir),
    png300Dir: toPublicPath(png300Dir),
    catalog: path.relative(rootDir, docsFile),
    htmlCatalog: path.relative(rootDir, htmlFile),
    oversizedSvg: oversized.length
  }, null, 2));
}

function buildIcon(product: Product) {
  const palette = (categoryStyles[product.category] ?? fallbackCategoryStyle()).palette;
  const baseGlyph = (categoryStyles[product.category] ?? fallbackCategoryStyle()).baseGlyph(palette);
  const detail = pickDetailGlyph(product);
  const initials = getInitials(product.name);
  const signature = drawSignatureDots(product.name, palette);
  const unitBadge = drawUnitBadge(product.unit, palette);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none" role="img" aria-label="${escapeXml(product.name)}">`,
    `<title>${escapeXml(product.name)}</title>`,
    `<desc>${escapeXml(`${product.category} · ${product.notes || "Icona prodotto"}`)}</desc>`,
    `<circle cx="128" cy="128" r="92" fill="${palette.accentSoft}" fill-opacity="0.16"/>`,
    `<circle cx="128" cy="128" r="92" stroke="${palette.accent}" stroke-width="8"/>`,
    `<circle cx="128" cy="128" r="108" stroke="${basePalette.ink}" stroke-opacity="0.08" stroke-width="2"/>`,
    signature,
    baseGlyph,
    detail.draw(palette),
    unitBadge,
    drawMonogramBadge(initials, palette),
    `</svg>`
  ].join("");
}

function pickDetailGlyph(product: Product): DetailGlyph {
  const haystack = `${product.name} ${product.notes} ${product.category}`;
  const matched = keywordGlyphs.find((glyph) => glyph.matches.some((pattern) => pattern.test(haystack)));
  if (matched) return { label: matched.label, draw: matched.draw };
  return { label: "sparkle", draw: drawSparkle };
}

function makePalette(accent: string): Palette {
  return {
    accent,
    accentSoft: `${accent}33`,
    accentStrong: accent
  };
}

function fallbackCategoryStyle(): CategoryStyle {
  return {
    palette: makePalette(basePalette.leaf),
    baseGlyph: drawBottle
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getInitials(name: string) {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (!words.length) return "PR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function hashString(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function drawSignatureDots(seed: string, palette: Palette) {
  const hash = hashString(seed);
  const points = [
    [74 + (hash % 18), 60 + ((hash >> 4) % 12)],
    [128 + ((hash >> 8) % 18), 46 + ((hash >> 12) % 14)],
    [176 + ((hash >> 16) % 12), 64 + ((hash >> 20) % 12)]
  ];

  return points
    .map(([cx, cy], index) => `<circle cx="${cx}" cy="${cy}" r="${index === 1 ? 6 : 4.5}" fill="${palette.accent}" fill-opacity="${index === 1 ? "1" : "0.75"}"/>`)
    .join("");
}

function drawUnitBadge(unit: string, palette: Palette) {
  const label = unitBadges[unit] ?? unit.slice(0, 2).toUpperCase();
  return [
    `<g transform="translate(168 36)">`,
    `<rect x="0" y="0" width="52" height="28" rx="14" fill="${basePalette.cream}" stroke="${palette.accent}" stroke-width="3"/>`,
    `<text x="26" y="19" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="${basePalette.ink}">${escapeXml(label)}</text>`,
    `</g>`
  ].join("");
}

function drawMonogramBadge(initials: string, palette: Palette) {
  return [
    `<g transform="translate(76 176)">`,
    `<rect x="0" y="0" width="104" height="40" rx="20" fill="${basePalette.ink}"/>`,
    `<rect x="4" y="4" width="96" height="32" rx="16" fill="${palette.accent}"/>`,
    `<text x="52" y="26" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="white" letter-spacing="1">${escapeXml(initials)}</text>`,
    `</g>`
  ].join("");
}

function drawBottle(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M112 78h32"/>`,
    `<path d="M118 56h20v22h-20z" fill="${palette.accentSoft}" stroke="${basePalette.ink}"/>`,
    `<path d="M102 88c0-8 6-14 14-14h24c8 0 14 6 14 14v48c0 14-10 26-24 30l-2 .6-2-.6c-14-4-24-16-24-30V88Z" fill="${palette.accentSoft}"/>`,
    `</g>`
  ].join("");
}

function drawWineBottle(palette: Palette) {
  return [
    drawBottle(palette),
    `<path d="M128 98v52" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"/>`
  ].join("");
}

function drawBeerGlass(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M96 84h56l-8 62c-1 8-8 14-16 14h-8c-8 0-15-6-16-14l-8-62Z" fill="${palette.accentSoft}"/>`,
    `<path d="M152 96h12c8 0 14 6 14 14v14c0 8-6 14-14 14h-10"/>`,
    `<path d="M96 84c6-12 16-18 28-18 8 0 15 3 20 10 4-4 9-6 15-6 10 0 18 8 18 18 0 4-1 8-3 12" fill="none"/>`,
    `</g>`
  ].join("");
}

function drawCan(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<rect x="98" y="72" width="60" height="96" rx="16" fill="${palette.accentSoft}"/>`,
    `<path d="M108 88h40"/>`,
    `<path d="M108 152h40"/>`,
    `</g>`
  ].join("");
}

function drawAperitifGlass(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M88 84h80l-16 28c-6 10-16 16-28 16h-4c-12 0-22-6-28-16L88 84Z" fill="${palette.accentSoft}"/>`,
    `<path d="M128 128v26"/>`,
    `<path d="M108 166h40"/>`,
    `</g>`
  ].join("");
}

function drawSparklingGlass(palette: Palette) {
  return [
    drawAperitifGlass(palette),
    `<path d="M152 68l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="${palette.accent}" stroke="none"/>`
  ].join("");
}

function drawHighballGlass(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<rect x="102" y="70" width="52" height="94" rx="14" fill="${palette.accentSoft}"/>`,
    `<path d="M116 86l24 64"/>`,
    `</g>`
  ].join("");
}

function drawCarton(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M104 78h38l12 18v58c0 8-6 14-14 14h-22c-8 0-14-6-14-14V78Z" fill="${palette.accentSoft}"/>`,
    `<path d="M142 78l-10-18h-18"/>`,
    `</g>`
  ].join("");
}

function drawFoldedPaper(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M98 88h54c8 0 14 6 14 14v42c0 8-6 14-14 14h-54c-8 0-14-6-14-14v-42c0-8 6-14 14-14Z" fill="${palette.accentSoft}"/>`,
    `<path d="M98 104h54"/>`,
    `<path d="M114 88v70"/>`,
    `</g>`
  ].join("");
}

function drawPlateCover(palette: Palette) {
  return [
    `<g stroke="${basePalette.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M84 142h88"/>`,
    `<path d="M94 140c4-30 34-50 62-42 18 5 31 20 36 42" fill="${palette.accentSoft}"/>`,
    `<path d="M128 84v10"/>`,
    `</g>`
  ].join("");
}

function drawCitrusSlice(palette: Palette) {
  return [
    `<g transform="translate(154 108)">`,
    `<path d="M0 34a34 34 0 1 1 68 0H0Z" fill="${palette.accent}" fill-opacity="0.2" stroke="${palette.accent}" stroke-width="6"/>`,
    `<path d="M34 2v30M10 32l24-30M58 32 34 2" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/>`,
    `</g>`
  ].join("");
}

function drawBerryCluster(palette: Palette) {
  return circlesGlyph([[170, 118], [188, 108], [194, 128], [176, 138]], 10, palette.accent);
}

function drawLeafSprig(palette: Palette) {
  return [
    `<path d="M176 146c8-20 20-32 38-38-2 20-10 34-26 44-8 5-16 7-24 6 2-4 6-8 12-12Z" fill="${palette.accent}" fill-opacity="0.22" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`,
    `<path d="M168 150c12-12 26-22 40-30" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/>`
  ].join("");
}

function drawBolt(palette: Palette) {
  return `<path d="M178 104l-18 34h14l-10 26 30-38h-14l10-22Z" fill="${palette.accent}" stroke="${palette.accent}" stroke-width="4" stroke-linejoin="round"/>`;
}

function drawBubbles(palette: Palette) {
  return circlesGlyph([[180, 110], [196, 124], [176, 136], [192, 148]], [8, 12, 6, 4], palette.accent);
}

function drawAgave(palette: Palette) {
  return [
    `<path d="M176 154c2-22 8-36 18-48 2 16 1 28-4 38M176 154c-6-18-14-30-26-40 0 16 4 28 12 38M176 154c-1-22 1-36 6-50 8 14 10 26 8 40" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
  ].join("");
}

function drawJuniper(palette: Palette) {
  return [
    circlesGlyph([[180, 126], [192, 118], [196, 132]], 8, palette.accent),
    `<path d="M168 144c8-10 18-18 28-24" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>`
  ].join("");
}

function drawGrapes(palette: Palette) {
  return [
    circlesGlyph([[178, 114], [192, 114], [171, 128], [185, 128], [199, 128], [178, 142], [192, 142]], 7, palette.accent),
    `<path d="M185 100c4-8 10-14 18-18" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>`
  ].join("");
}

function drawHop(palette: Palette) {
  return `<path d="M178 108c14 4 22 16 22 30 0 14-10 24-24 24-12 0-22-9-22-21 0-11 8-20 19-21-2-7 0-12 5-17Z" fill="${palette.accent}" fill-opacity="0.18" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`;
}

function drawFlame(palette: Palette) {
  return `<path d="M182 104c10 12 14 22 14 34 0 16-10 28-24 28s-24-11-24-25c0-8 3-15 8-22 1 8 5 14 12 18 1-15 6-26 14-33Z" fill="${palette.accent}" fill-opacity="0.22" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`;
}

function drawPaperFold(palette: Palette) {
  return [
    `<path d="M166 110h40v42h-40c-8 0-14-6-14-14v-14c0-8 6-14 14-14Z" fill="${palette.accent}" fill-opacity="0.18" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`,
    `<path d="M178 110v42" stroke="${palette.accent}" stroke-width="6"/>`
  ].join("");
}

function drawGrain(palette: Palette) {
  return `<path d="M174 152c0-18 6-34 18-48M166 142c8-8 18-14 30-20M170 126c8-4 18-8 28-10" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/>`;
}

function drawCheese(palette: Palette) {
  return [
    `<path d="M162 146l34-30 18 34h-52c-4 0-6-2-6-6v-2c0-2 2-4 6-4Z" fill="${palette.accent}" fill-opacity="0.18" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`,
    circlesGlyph([[184, 132], [194, 142], [174, 142]], [3, 4, 3], palette.accent)
  ].join("");
}

function drawTomato(palette: Palette) {
  return [
    `<circle cx="184" cy="132" r="20" fill="${palette.accent}" fill-opacity="0.18" stroke="${palette.accent}" stroke-width="6"/>`,
    `<path d="M184 108l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="${palette.accent}" stroke="none"/>`
  ].join("");
}

function drawLeaf(palette: Palette) {
  return `<path d="M164 152c4-24 16-40 40-48-2 26-10 40-28 50-8 4-14 4-20 2 2-2 5-3 8-4Z" fill="${palette.accent}" fill-opacity="0.18" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`;
}

function drawCharcuterie(palette: Palette) {
  return [
    `<path d="M160 120c10-8 26-8 38 0M158 136c14-10 30-10 44 0M164 152c8-6 18-8 30-8" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/>`
  ].join("");
}

function drawSauceSwirl(palette: Palette) {
  return `<path d="M162 146c4-18 20-30 38-26 10 2 18 10 18 20 0 14-12 24-28 24-12 0-24-6-30-16 8 4 16 4 24 0 8-4 10-12 6-18-4-5-12-6-18-2-4 2-7 7-10 18Z" fill="${palette.accent}" fill-opacity="0.12" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/>`;
}

function drawSparkle(palette: Palette) {
  return `<path d="M182 106l6 14 14 6-14 6-6 14-6-14-14-6 14-6Z" fill="${palette.accent}" stroke="none"/>`;
}

function circlesGlyph(
  points: Array<[number, number]>,
  radius: number | number[],
  fill: string
) {
  return points
    .map(([cx, cy], index) => {
      const r = Array.isArray(radius) ? radius[index] : radius;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity="0.22" stroke="${fill}" stroke-width="4"/>`;
    })
    .join("");
}

function buildMarkdownCatalog(manifest: IconManifestEntry[]) {
  const lines = [
    "# Catalogo icone prodotto",
    "",
    "Set generato automaticamente dal catalogo Supabase con stile coerente al brand.",
    "",
    "## Specifiche",
    "",
    "- Formato vettoriale: SVG con sfondo trasparente",
    "- Formato raster web: PNG 72dpi (`256x256`)",
    "- Formato raster stampa: PNG 300dpi (`1200x1200`)",
    "- Stile: silhouette per categoria + dettaglio prodotto + monogramma + firma geometrica",
    "- Limite SVG: ottimizzato per restare sotto `50KB` per file",
    "",
    "## Implementazione",
    "",
    "- Web/App: usa preferibilmente il file SVG",
    "- PDF/Cataloghi stampa: usa il file PNG 300dpi",
    "- Thumbnail o liste mobile: usa SVG o PNG 72dpi a seconda del renderer",
    "- Mapping machine-readable: `public/product-icons/catalog.json`",
    "",
    "## Mapping",
    "",
    "| ID | Prodotto | Categoria | Dettaglio | SVG | PNG 72dpi | PNG 300dpi |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const entry of manifest) {
    const svgLink = `..${entry.svg}`;
    const png72Link = `..${entry.png72}`;
    const png300Link = `..${entry.png300}`;
    lines.push(`| ${entry.id} | ${escapeMd(entry.name)} | ${escapeMd(entry.category)} | ${entry.detail} | [SVG](${svgLink}) | [PNG 72](${png72Link}) | [PNG 300](${png300Link}) |`);
  }

  return `${lines.join("\n")}\n`;
}

function buildHtmlCatalog(manifest: IconManifestEntry[]) {
  const cards = manifest.map((entry) => `
    <article class="card">
      <img src=".${entry.svg}" alt="${escapeHtml(entry.name)}" width="96" height="96" />
      <h3>${escapeHtml(entry.name)}</h3>
      <p>${escapeHtml(entry.category)} · ${escapeHtml(entry.unit)}</p>
      <p class="meta">${escapeHtml(entry.detail)} · ${escapeHtml(entry.initials)}</p>
      <div class="links">
        <a href=".${entry.svg}">SVG</a>
        <a href=".${entry.png72}">PNG 72dpi</a>
        <a href=".${entry.png300}">PNG 300dpi</a>
      </div>
    </article>
  `).join("");

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Catalogo icone prodotto</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #172033; }
    header { padding: 24px; background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding: 24px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
    .card img { display: block; margin-bottom: 12px; }
    h1, h3, p { margin: 0; }
    h1 { font-size: 22px; }
    h3 { font-size: 16px; margin-bottom: 6px; }
    p { font-size: 13px; color: #475569; }
    .meta { margin-top: 4px; color: #0f766e; font-weight: 600; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .links a { text-decoration: none; color: white; background: #172033; padding: 6px 10px; border-radius: 999px; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <h1>Catalogo icone prodotto</h1>
    <p>${manifest.length} icone generate con palette uniforme e sfondo trasparente.</p>
  </header>
  <main>${cards}</main>
</body>
</html>`;
}

function recreateDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function toPublicPath(filePath: string) {
  return `/${path.relative(path.join(rootDir, "public"), filePath).split(path.sep).join("/")}`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeMd(value: string) {
  return value.replace(/\|/g, "\\|");
}

function escapeHtml(value: string) {
  return escapeXml(value);
}

await main();
