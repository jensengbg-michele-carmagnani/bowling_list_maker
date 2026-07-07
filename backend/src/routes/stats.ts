import { Router } from "express";
import { dashboardStats, orderStats } from "../services/statsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const statsRouter = Router();

statsRouter.get("/dashboard", asyncHandler((_req, res) => res.json(dashboardStats())));
statsRouter.get("/orders", asyncHandler((_req, res) => res.json(orderStats())));
