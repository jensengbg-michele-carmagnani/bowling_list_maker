import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../services/productService.js";

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler((req, res) => {
    res.json(listProducts(req.query as { search?: string; category?: string; habitual?: string }));
  })
);

productsRouter.post(
  "/",
  asyncHandler((req, res) => {
    res.status(201).json(createProduct(req.body));
  })
);

productsRouter.put(
  "/:id",
  asyncHandler((req, res) => {
    const product = updateProduct(Number(req.params.id), req.body);
    if (!product) return res.status(404).json({ message: "Prodotto non trovato" });
    return res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler((req, res) => {
    if (!deleteProduct(Number(req.params.id))) return res.status(404).json({ message: "Prodotto non trovato" });
    return res.status(204).send();
  })
);
