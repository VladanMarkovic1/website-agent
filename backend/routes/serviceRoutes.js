import express from 'express';
import { updateBusinessServices, getBusinessServices } from '../controllers/serviceControllers/serviceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in serviceRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation for businessId in URL parameter (assuming slug)
const businessIdParamValidation = [
    param('businessId', 'Business ID in URL is required').notEmpty().trim().escape()
    // If businessId was intended to be ObjectId, use .isMongoId()
];

// Validation rules for updating services (PUT request body)
const updateServicesValidationRules = [
    body('services').isArray({ min: 0 }).withMessage('Services must be an array'),
    // Validate each item within the services array
    body('services.*.name', 'Service name is required').notEmpty().trim().escape(),
    body('services.*.description').optional().trim().escape(),
    body('services.*.price').optional().trim().escape(),
    body('services.*.manualOverride').optional().isBoolean().withMessage('Manual override must be true or false')
];

// General rate limiter for authenticated service routes
const generalApiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // Limit each IP to 200 requests per windowMs
	message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply the general limiter to all routes in this file
router.use(generalApiLimiter);

// console.log("✅ Service Routes Initialized"); // REMOVED

// GET business services
router.get(
    '/:businessId',
    authenticateToken, 
    businessIdParamValidation, // Validate URL param
    handleValidationErrors,
    checkBusinessOwner,        // Check ownership after validation
    (req, res) => {
        // console.log(`🔹 GET Request Received for businessId: ${req.params.businessId}`); // REMOVED
        getBusinessServices(req, res);
    }
);

// Update business services
router.put(
    '/:businessId',
    authenticateToken,
    businessIdParamValidation,    // Validate URL param
    updateServicesValidationRules,// Validate request body
    handleValidationErrors,
    checkBusinessOwner,           // Check ownership after validation
    (req, res) => {
        // console.log(`🔹 PUT Request Received for businessId: ${req.params.businessId}`); // REMOVED
        updateBusinessServices(req, res);
    }
);

export default router;

