// src/routes/userRoutes.js
import express from 'express';
import { signup, login, getUserById } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/signup', signup);
router.post('/login', login);

// Protected routes (authentication required)
router.get('/:id', authenticateToken, getUserById);

export default router;