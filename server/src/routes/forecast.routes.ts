import { Router } from "express";
import { getForecastData } from "../controllers/forecast.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();
router.get("/", requireAuth, requireAnyPermission("analytics:forecasting", "inventory:drugRisk"), getForecastData);
export default router;
