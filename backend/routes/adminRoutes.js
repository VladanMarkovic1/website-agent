import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import adminController from '../controllers/adminControllers/adminController.js';

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticateToken);
router.use(adminAuth);

// Get all businesses (admin only)
router.get('/businesses', adminController.getBusinesses);

// Get all business owners (admin only)
router.get('/business-owners', adminController.getBusinessOwners);

// Send invitation (admin only)
router.post('/invite', adminController.sendInvitation);

export default router;
