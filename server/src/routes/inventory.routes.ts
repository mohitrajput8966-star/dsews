import { Router } from "express";
import multer from "multer";
import { list, batches, movements, create, update, deactivate, csvTemplate, csvImport } from "../controllers/inventory.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const canView = requireAnyPermission("inventory:all", "inventory:pharmacy", "inventory:warehouse");
const canEdit = requireAnyPermission("inventory:all", "inventory:warehouse");

router.get("/", requireAuth, canView, list);
router.get("/batches", requireAuth, requireAnyPermission("inventory:batches", "inventory:all"), batches);
router.get("/movements", requireAuth, requireAnyPermission("inventory:stockMovements", "inventory:all"), movements);
router.get("/import/template", requireAuth, canEdit, csvTemplate);
router.post("/import", requireAuth, canEdit, upload.single("file"), csvImport);
router.post("/", requireAuth, canEdit, create);
router.patch("/:id", requireAuth, canEdit, update);
router.post("/drugs/:drugId/deactivate", requireAuth, requirePermission("settings:organization"), deactivate);

export default router;
