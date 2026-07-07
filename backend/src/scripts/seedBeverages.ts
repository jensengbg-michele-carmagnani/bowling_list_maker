import { seedBeverageCatalog } from "../services/seedService.js";

const result = seedBeverageCatalog();
console.log(`Catalogo bevande: ${result.inserted} prodotti aggiunti, ${result.skipped} gia presenti.`);
