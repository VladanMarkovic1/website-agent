import express from 'express';
import { getAnalyticsData, getTodaysAnalytics } from '../controllers/analyticsControllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';

const router = express.Router();

// Protected analytics routes - require both auth and business owner check
router.get('/business/:businessId', authenticateToken, checkBusinessOwner, getAnalyticsData);
router.get('/business/:businessId/today', authenticateToken, checkBusinessOwner, getTodaysAnalytics);

export default router; 