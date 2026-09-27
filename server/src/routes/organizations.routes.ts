import { Router } from "express";
import { getCurrentOrganization, updateCurrentOrganization, completeOnboarding } from "../controllers/organizations.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();

router.get("/current", requireAuth, getCurrentOrganization);
router.patch("/current", requireAuth, requirePermission("settings:organization"), updateCurrentOrganization);
router.post("/current/complete-onboarding", requireAuth, requirePermission("settings:organization"), completeOnboarding);

export default router;
