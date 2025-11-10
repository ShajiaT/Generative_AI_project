// src/routes/authRoutes.js
import express from "express";
import { signup, login, getProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/signup", signup);
router.post("/login", login);

// Protected routes (authentication required)
router.get("/profile", authenticate, getProfile);

export default router;
