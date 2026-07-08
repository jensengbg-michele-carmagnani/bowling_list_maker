import { seedBeverageCatalog } from "../services/seedService.js";

const result = await seedBeverageCatalog();
console.log(`Catalogo bevande: ${result.inserted} prodotti aggiunti, ${result.skipped} gia presenti.`);
