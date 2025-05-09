import express from "express";
import { handleChatMessage } from "../controllers/chatbotControllers/chatbotController.js";
import { getPublicWidgetConfig } from "../controllers/public/publicSettingsController.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { body, validationResult } from 'express-validator'; // Import validators
import rateLimit from 'express-rate-limit'; // Import rate-limit

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Extract specific error messages for clarity
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        console.error("Validation errors for /message:", errors.array());
        return res.status(400).json({ error: `Invalid input: ${errorMessages}` }); // Send validation errors back
    }
    next();
};

// Define validation rules for the chatbot message route
const chatMessageValidationRules = [
    body('message', 'Message content is required').notEmpty().trim().escape(),
    body('sessionId', 'Session ID is required').notEmpty().trim().escape(),
    // REMOVED: businessId validation from body - will come from URL parameter
    // body('businessId', 'Business ID is required').notEmpty().trim().escape() 
];

// Rate limiter for chatbot messages
const chatbotLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 60, // Limit each IP/API Key (depending on apiKeyAuth implementation) to 60 requests per minute
	message: 'Too many requests sent, please try again shortly.',
    standardHeaders: true,
    legacyHeaders: false,
    // Note: Default keyGenerator uses IP. If apiKeyAuth sets req.apiKey, you might customize keyGenerator
    // keyGenerator: (req, res) => req.apiKey || req.ip 
});

// --- Update Route for Widget Configuration --- 
router.get(
    '/config/:businessId',
    // No API key auth needed for public config
    getPublicWidgetConfig // Use the specific public controller
);

// ✅ Endpoint for chatbot responses - Now protected by API Key and uses businessId in path
router.post(
    "/:businessId/message", // Use :businessId here for message handling
    chatbotLimiter, // Apply rate limiting
    apiKeyAuth, 
    chatMessageValidationRules, // REMOVED businessId from validation rules array above
    handleValidationErrors,     
    async (req, res) => {        
        try {
            await handleChatMessage(req, res);
        } catch (error) {
            console.error("Route Error in /message:", error);
            // Use the error message from the controller if available
            const statusCode = error.message === "Business not found" ? 404 : 500;
            res.status(statusCode).json({ 
                error: error.message || "Internal server error processing message" 
            });
        }
    }
);

export default router;
