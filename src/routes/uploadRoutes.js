// src/routes/uploadRoutes.js
import express from 'express';
import { upload, uploadBusinessImage, uploadImageToBusiness } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (authentication required)
router.post('/', authenticateToken, upload.single('image'), uploadBusinessImage);
router.post('/business/:businessId', authenticateToken, upload.single('image'), uploadImageToBusiness);

export default router;