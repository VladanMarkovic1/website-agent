import express from 'express';
import { param, validationResult } from 'express-validator';
import { getPublicWidgetConfig, getPublicBusinessOptions } from '../controllers/public/publicSettingsController.js';
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

// Rate limiter for public endpoints
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiter to all routes in this file
router.use(publicLimiter);

// Public route - NO AUTH NEEDED
router.get(
    '/widget-config/:businessId',
    businessIdParamValidation,
    handleValidationErrors,
    getPublicWidgetConfig
);

// Public-safe business options endpoint
router.get(
    '/options/:businessId',
    businessIdParamValidation,
    handleValidationErrors,
    getPublicBusinessOptions
);

export default router; 