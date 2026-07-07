import { seedKitchenCatalog } from "../services/seedService.js";

const result = seedKitchenCatalog();
console.log(`Catalogo cucina: ${result.inserted} prodotti aggiunti, ${result.skipped} gia presenti.`);
