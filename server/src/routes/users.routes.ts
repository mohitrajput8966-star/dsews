import { Router } from "express";
import { listUsers, createUser, updateUser, updateMyProfile } from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();

router.patch("/me", requireAuth, updateMyProfile);
router.get("/", requireAuth, requirePermission("settings:users"), listUsers);
router.post("/", requireAuth, requirePermission("settings:users"), createUser);
router.patch("/:id", requireAuth, requirePermission("settings:users"), updateUser);

export default router;
