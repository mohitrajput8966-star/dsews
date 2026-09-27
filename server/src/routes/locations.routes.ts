import { Router } from "express";
import { listLocations, createLocation, updateLocation } from "../controllers/locations.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();

router.get("/", requireAuth, listLocations);
router.post("/", requireAuth, requirePermission("settings:locations"), createLocation);
router.patch("/:id", requireAuth, requirePermission("settings:locations"), updateLocation);

export default router;
