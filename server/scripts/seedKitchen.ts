import { seedKitchenCatalog } from "../services/seedService";

const result = await seedKitchenCatalog();
console.log(`Catalogo cucina: ${result.inserted} prodotti aggiunti, ${result.skipped} gia presenti.`);
