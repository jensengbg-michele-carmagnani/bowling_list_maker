import { Router } from "express";
import { getSettings, updateSettings } from "../services/settingsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const settingsRouter = Router();

settingsRouter.get("/", asyncHandler(async (_req, res) => res.json(await getSettings())));
settingsRouter.put("/", asyncHandler(async (req, res) => res.json(await updateSettings(req.body))));
