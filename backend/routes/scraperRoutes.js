// All console.log statements removed for production. Only critical error logs retained.
import express from "express";
import { scrapeBusiness } from "../scraper/scraperController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
import { param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation for businessId in URL parameter (assuming slug)
const businessIdParamValidation = [
    param('businessId', 'Business ID in URL is required').notEmpty().trim().escape()
    // Use .isMongoId() if expecting ObjectId
];

// General rate limiter for authenticated scraper routes
const generalApiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Lower limit for scraping, e.g., 50 per 15 minutes
	message: 'Too many scraping requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Enhanced logging middleware
const loggingMiddleware = (req, res, next) => {
    next();
};

// TEST ROUTE WITHOUT AUTHENTICATION - FOR DEBUGGING ONLY
router.get(
    "/test/:businessId", 
    loggingMiddleware,
    generalApiLimiter,
    businessIdParamValidation,
    handleValidationErrors,
    (req, res, next) => {
        // Skip authentication for testing
        next();
    },
    scrapeBusiness
);

// Protect the route and apply rate limiting
router.get(
    "/:businessId", 
    loggingMiddleware,      // Add logging first
    generalApiLimiter,     // Apply limiter
    (req, res, next) => {
        next();
    },
    authenticateToken,     // Auth middleware with logging
    (req, res, next) => {
        next();
    },
    businessIdParamValidation, // Validate param
    handleValidationErrors,
    checkBusinessOwner,    // Check ownership after validation
    (req, res, next) => {
        next();
    },
    scrapeBusiness
);

export default router;
