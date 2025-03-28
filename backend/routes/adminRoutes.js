import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { sendInvitation } from '../controllers/adminControllers/adminController.js';
import Business from '../models/Business.js';

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticateToken);
router.use(adminAuth);

// Get all businesses (admin only)
router.get('/businesses', async (req, res) => {
    try {
        const businesses = await Business.find({}, 'businessId businessName websiteUrl');
        res.json(businesses);
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// Send invitation (admin only)
router.post('/invite', sendInvitation);

export default router;
