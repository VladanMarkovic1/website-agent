import express from 'express';
import { param, validationResult } from 'express-validator';
import { getPublicWidgetConfig } from '../controllers/public/publicSettingsController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation for businessId param
const businessIdParamValidation = [
    param('businessId', 'Business ID parameter is required').notEmpty().trim().escape()
];

// Rate limiter for public config endpoint
const configLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: 'Too many requests for configuration, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Public route - NO AUTH NEEDED
router.get(
    '/widget-config/:businessId',
    configLimiter, // Apply rate limiting
    businessIdParamValidation,
    handleValidationErrors,
    getPublicWidgetConfig
);

export default router; 