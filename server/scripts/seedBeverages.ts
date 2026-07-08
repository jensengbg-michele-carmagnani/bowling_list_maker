import { seedBeverageCatalog } from "../services/seedService";

const result = await seedBeverageCatalog();
console.log(`Catalogo bevande: ${result.inserted} prodotti aggiunti, ${result.skipped} gia presenti.`);
