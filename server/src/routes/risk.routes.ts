import { Router } from "express";
import { listRiskAssessments, getRiskAssessment } from "../controllers/risk.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();

const canViewRisk = requireAnyPermission("inventory:drugRisk", "alerts:risk", "executiveDashboard");

router.get("/inventory", requireAuth, canViewRisk, listRiskAssessments);
router.get("/inventory/:inventoryItemId", requireAuth, canViewRisk, getRiskAssessment);

export default router;
