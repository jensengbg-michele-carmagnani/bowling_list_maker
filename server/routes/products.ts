import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../services/productService";

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listProducts(req.query as { search?: string; category?: string; habitual?: string }));
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createProduct(req.body));
  })
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await updateProduct(Number(req.params.id), req.body);
    if (!product) return res.status(404).json({ message: "Prodotto non trovato" });
    return res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!(await deleteProduct(Number(req.params.id)))) return res.status(404).json({ message: "Prodotto non trovato" });
    return res.status(204).send();
  })
);
