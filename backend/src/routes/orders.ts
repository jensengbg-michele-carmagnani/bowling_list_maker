import { Router } from "express";
import { createOrder, deleteOrder, duplicateOrder, getOrder, listOrders, previousOrderItems, productLastQuantities, updateOrder } from "../services/orderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const ordersRouter = Router();

ordersRouter.get("/", asyncHandler((_req, res) => res.json(listOrders())));
ordersRouter.get("/previous", asyncHandler((_req, res) => res.json(previousOrderItems())));
ordersRouter.get("/last-quantities", asyncHandler((_req, res) => res.json(productLastQuantities())));

ordersRouter.get(
  "/:id",
  asyncHandler((req, res) => {
    const order = getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.json(order);
  })
);

ordersRouter.post(
  "/",
  asyncHandler((req, res) => {
    res.status(201).json(createOrder(req.body));
  })
);

ordersRouter.put(
  "/:id",
  asyncHandler((req, res) => {
    const order = updateOrder(Number(req.params.id), req.body);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.json(order);
  })
);

ordersRouter.post(
  "/:id/duplicate",
  asyncHandler((req, res) => {
    const order = duplicateOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.status(201).json(order);
  })
);

ordersRouter.delete(
  "/:id",
  asyncHandler((req, res) => {
    if (!deleteOrder(Number(req.params.id))) return res.status(404).json({ message: "Ordine non trovato" });
    return res.status(204).send();
  })
);
