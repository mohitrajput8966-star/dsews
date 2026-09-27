import { Router } from "express";
import { getAlerts, regenerate, unreadCount, markRead, markAll } from "../controllers/alerts.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();
const canViewAlerts = requireAnyPermission("alerts:risk", "alerts:critical", "inventory:drugRisk", "executiveDashboard");

router.get("/", requireAuth, canViewAlerts, getAlerts);
router.post("/regenerate", requireAuth, canViewAlerts, regenerate);
router.get("/unread-count", requireAuth, canViewAlerts, unreadCount);
router.post("/mark-all-read", requireAuth, canViewAlerts, markAll);
router.patch("/:id/read", requireAuth, canViewAlerts, markRead);

export default router;
