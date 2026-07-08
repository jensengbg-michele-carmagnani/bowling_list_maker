import { Router } from "express";
import { createOrder, deleteOrder, duplicateOrder, getOrder, listOrders, previousOrderItems, productLastQuantities, updateOrder } from "../services/orderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const ordersRouter = Router();

ordersRouter.get("/", asyncHandler(async (_req, res) => res.json(await listOrders())));
ordersRouter.get("/previous", asyncHandler(async (_req, res) => res.json(await previousOrderItems())));
ordersRouter.get("/last-quantities", asyncHandler(async (_req, res) => res.json(await productLastQuantities())));

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.json(order);
  })
);

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createOrder(req.body));
  })
);

ordersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await updateOrder(Number(req.params.id), req.body);
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.json(order);
  })
);

ordersRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const order = await duplicateOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Ordine non trovato" });
    return res.status(201).json(order);
  })
);

ordersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!(await deleteOrder(Number(req.params.id)))) return res.status(404).json({ message: "Ordine non trovato" });
    return res.status(204).send();
  })
);
