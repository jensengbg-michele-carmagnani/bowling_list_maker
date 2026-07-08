import { Router } from "express";
import { dashboardStats, orderStats } from "../services/statsService";
import { asyncHandler } from "../utils/asyncHandler";

export const statsRouter = Router();

statsRouter.get("/dashboard", asyncHandler(async (_req, res) => res.json(await dashboardStats())));
statsRouter.get("/orders", asyncHandler(async (_req, res) => res.json(await orderStats())));
