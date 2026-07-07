import { Router } from "express";
import { getSettings, updateSettings } from "../services/settingsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const settingsRouter = Router();

settingsRouter.get("/", asyncHandler((_req, res) => res.json(getSettings())));
settingsRouter.put("/", asyncHandler((req, res) => res.json(updateSettings(req.body))));
