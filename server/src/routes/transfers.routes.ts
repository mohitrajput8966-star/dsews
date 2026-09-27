import { Router } from "express";
import { getRecommendations, list, create, complete, cancel } from "../controllers/transfers.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();
const canTransfer = requireAnyPermission("inventory:transfers", "inventory:all", "inventory:warehouse");

router.get("/recommendations", requireAuth, canTransfer, getRecommendations);
router.get("/", requireAuth, canTransfer, list);
router.post("/", requireAuth, canTransfer, create);
router.post("/:id/complete", requireAuth, canTransfer, complete);
router.post("/:id/cancel", requireAuth, canTransfer, cancel);

export default router;
