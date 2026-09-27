import { Router } from "express";
import { abcVed, fsn, expiry, suppliers, supplierList } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission, requireAnyPermission } from "../middleware/rbac.middleware";

const router = Router();

router.get("/abc-ved", requireAuth, requirePermission("analytics:abcVed"), abcVed);
router.get("/fsn", requireAuth, requirePermission("analytics:fsn"), fsn);
router.get("/expiry", requireAuth, requireAnyPermission("inventory:expiry", "inventory:all"), expiry);
router.get("/suppliers", requireAuth, requirePermission("procurement:suppliers"), suppliers);
router.get("/suppliers-list", requireAuth, supplierList);

export default router;
