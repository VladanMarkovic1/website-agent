import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { sendInvitation } from '../controllers/adminControllers/adminController.js';

const router = express.Router();

// POST /admin/invite
// Secured endpoint for admins to send invitation emails.
router.post('/invite', authenticateToken, adminAuth, sendInvitation);

export default router;
