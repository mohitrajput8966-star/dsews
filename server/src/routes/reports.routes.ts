import { Router } from "express";
import { getReport } from "../controllers/reports.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();
router.get("/:key", requireAuth, requirePermission("reports"), getReport);
export default router;
