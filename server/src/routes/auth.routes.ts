import { Router } from "express";
import { login, logout, me, registerOrganization } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/register-organization", registerOrganization);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
