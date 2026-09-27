import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();
router.get("/", requireAuth, requirePermission("dashboard"), getDashboardData);
export default router;
