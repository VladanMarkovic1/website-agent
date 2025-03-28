import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { sendInvitation } from '../controllers/adminControllers/adminController.js';
import Business from '../models/Business.js';

const router = express.Router();

// POST /admin/invite
// Secured endpoint for admins to send invitation emails.
router.post('/invite', authenticateToken, adminAuth, sendInvitation);

// Get all businesses (admin only)
router.get('/businesses', authenticateToken, adminAuth, async (req, res) => {
    try {
        const businesses = await Business.find({}, 'businessId businessName websiteUrl');
        res.json(businesses);
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

export default router;
