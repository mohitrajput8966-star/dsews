import { Router } from "express";
import { listRequests, createRequest, updateStatus } from "../controllers/procurement.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();
const canManage = requireAnyPermission("procurement:purchaseRequests", "procurement:recommendations");

router.get("/requests", requireAuth, canManage, listRequests);
router.post("/requests", requireAuth, canManage, createRequest);
router.patch("/requests/:id/status", requireAuth, canManage, updateStatus);

export default router;
