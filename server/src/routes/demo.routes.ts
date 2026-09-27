import { Router } from "express";
import { resetDemo } from "../controllers/demo.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";

const router = Router();
router.post("/reset", requireAuth, requireRole("ADMIN"), resetDemo);
export default router;
