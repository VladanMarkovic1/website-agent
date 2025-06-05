console.log("🔄 IMPORTING SCRAPER ROUTE DEPENDENCIES...");
import express from "express";
console.log("✅ EXPRESS IMPORTED");
import { scrapeBusiness } from "../scraper/scraperController.js";
console.log("✅ SCRAPE BUSINESS IMPORTED");
import { authenticateToken } from "../middleware/auth.js";
console.log("✅ AUTHENTICATE TOKEN IMPORTED");
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
console.log("✅ CHECK BUSINESS OWNER IMPORTED");
import { param, validationResult } from 'express-validator';
console.log("✅ EXPRESS VALIDATOR IMPORTED");
import rateLimit from 'express-rate-limit';
console.log("✅ RATE LIMIT IMPORTED");

const router = express.Router();
console.log("✅ ROUTER CREATED");

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    console.log("🔍 CHECKING VALIDATION ERRORS...");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("❌ VALIDATION ERRORS IN SCRAPER ROUTES:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    console.log("✅ VALIDATION PASSED");
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
    console.log("🚀 SCRAPER ROUTE HIT");
    console.log("📋 REQUEST METHOD:", req.method);
    console.log("📋 REQUEST URL:", req.url);
    console.log("📋 REQUEST PARAMS:", req.params);
    console.log("📋 REQUEST HEADERS:", JSON.stringify(req.headers, null, 2));
    console.log("📋 REQUEST BODY:", JSON.stringify(req.body, null, 2));
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
        console.log("🧪 TEST ROUTE - BYPASSING AUTH");
        // Skip authentication for testing
        next();
    },
    scrapeBusiness
);
console.log("✅ TEST SCRAPER ROUTE ADDED");

// Protect the route and apply rate limiting
router.get(
    "/:businessId", 
    loggingMiddleware,      // Add logging first
    generalApiLimiter,     // Apply limiter
    (req, res, next) => {
        console.log("🔐 STARTING AUTHENTICATION...");
        next();
    },
    authenticateToken,     // Auth middleware with logging
    (req, res, next) => {
        console.log("✅ AUTHENTICATION PASSED, CHECKING BUSINESS OWNERSHIP...");
        next();
    },
    businessIdParamValidation, // Validate param
    handleValidationErrors,
    checkBusinessOwner,    // Check ownership after validation
    (req, res, next) => {
        console.log("✅ BUSINESS OWNERSHIP VERIFIED, STARTING SCRAPING...");
        next();
    },
    scrapeBusiness
);
console.log("✅ AUTHENTICATED SCRAPER ROUTE ADDED");

console.log("✅ SCRAPER ROUTES MODULE LOADED");

export default router;
