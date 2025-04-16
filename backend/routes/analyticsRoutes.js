import express from 'express';
import { getAnalyticsData, getTodaysAnalytics } from '../controllers/analyticsControllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import { param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in analyticsRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation for businessId in URL parameter (assuming slug)
const businessIdParamValidation = [
    param('businessId', 'Business ID in URL is required').notEmpty().trim().escape()
    // Use .isMongoId() if expecting ObjectId
];

// Validation for date query parameters
const dateQueryValidation = [
    query('startDate', 'Start date is required and must be a valid date (YYYY-MM-DD)').isISO8601().toDate(),
    query('endDate', 'End date is required and must be a valid date (YYYY-MM-DD)').isISO8601().toDate()
];

// General rate limiter for authenticated analytics routes
const generalApiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // Limit each IP to 200 requests per windowMs
	message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Protected analytics routes
router.get(
    '/business/:businessId',
    generalApiLimiter,
    authenticateToken,
    businessIdParamValidation,
    dateQueryValidation,
    handleValidationErrors,
    checkBusinessOwner,
    getAnalyticsData
);

router.get(
    '/business/:businessId/today',
    generalApiLimiter,
    authenticateToken,
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner,
    getTodaysAnalytics
);

export default router; 