// src/routes/businessRoutes.js
import express from 'express';
import { 
  createBusiness, 
  getAllBusinesses, 
  getBusinessById, 
  updateBusiness, 
  deleteBusiness,
  validateBusinessImages
} from '../controllers/businessController.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllBusinesses);                              // GET /api/business
router.get('/:id', getBusinessById);                            // GET /api/business/:id
router.get('/validate-images/:businessId', validateBusinessImages); // GET /api/business/validate-images/:businessId

// Protected routes (authentication required)
router.post('/', authenticateToken, createBusiness);            // POST /api/business
router.put('/:id', authenticateToken, updateBusiness);          // PUT /api/business/:id
router.delete('/:id', authenticateToken, deleteBusiness);       // DELETE /api/business/:id

export default router;