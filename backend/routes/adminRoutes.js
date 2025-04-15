import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import invitationController from '../controllers/adminControllers/sendInvitation.js';
import businessOwnerController from '../controllers/adminControllers/businessOwnerController.js';

const router = express.Router();

// Rate limiting for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply security middleware
router.use(authenticateToken);  // Verify JWT token
router.use(adminAuth);         // Verify admin role
router.use(adminLimiter);      // Apply rate limiting

// Get all businesses (admin only)
router.get('/businesses', businessOwnerController.getBusinesses);

// Get all business owners (admin only)
router.get('/business-owners', businessOwnerController.getBusinessOwners);

// Send invitation (admin only)
router.post('/invite', invitationController.sendInvitation);

export default router;
