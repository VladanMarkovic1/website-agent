import express from "express";
import { sendFollowUpEmail } from "../controllers/emailControllers/emailService.js";
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in emailRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules for sending follow-up emails
const followUpEmailValidationRules = [
    body('leadId', 'Lead ID must be a valid MongoDB ObjectId').isMongoId(),
    body('emailType', 'Email type is required').notEmpty().isIn(['followUp', 'reminder']).withMessage('Invalid email type') // Example types
    // Add other fields if needed by sendFollowUpEmail
];

// Rate limiter for sending emails
const emailLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 20, // Limit each IP to 20 email requests per hour
	message: 'Too many email requests from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// Route to send follow-up emails
router.post(
    "/send-followup", 
    emailLimiter, // Apply rate limiting
    followUpEmailValidationRules, 
    handleValidationErrors,       
    sendFollowUpEmail           
);

export default router;
