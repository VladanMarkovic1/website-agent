import express from "express";
import { getLeads } from '../controllers/leadControllers/getLeadsController.js';
import { createLeadHandler } from '../controllers/leadControllers/createLeadHandler.js';
import { updateLeadStatus } from '../controllers/leadControllers/updateLeadStatusController.js';
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
import { addNoteForLeadController } from "../controllers/leadControllers/addNoteForLeadController.js";
import { removeNoteFromLeadController } from "../controllers/leadControllers/removeNoteFromLeadController.js";
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in leadRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation for contact form (public endpoint)
const contactFormValidationRules = [
    body('name', 'Name is required').notEmpty().trim().escape(),
    body('email', 'Valid email is required').isEmail().normalizeEmail(),
    body('practiceName', 'Practice name is required').notEmpty().trim().escape(),
    body('practiceWebsite').optional({ checkFalsy: true }).isURL().withMessage('Please provide a valid URL'),
    body('message').optional().trim().escape()
];

// Rate limiter specifically for contact form (more restrictive)
const contactFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 contact form submissions per windowMs
    message: 'Too many contact form submissions from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /contact - Public contact form endpoint for demo requests
router.post(
    "/contact",
    contactFormLimiter,
    contactFormValidationRules,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, email, practiceName, practiceWebsite, message } = req.body;
            
            console.log("📧 New demo request received:", {
                name,
                email,
                practiceName,
                practiceWebsite: practiceWebsite || 'Not provided',
                message: message || 'Standard demo request',
                timestamp: new Date().toISOString(),
                ip: req.ip
            });

            // Here you could save to database, send email, etc.
            // For now, we'll just log it and return success
            
            res.status(200).json({
                success: true,
                message: "Demo request received successfully! We'll contact you within 24 hours."
            });
            
        } catch (error) {
            console.error("❌ Error handling contact form:", error);
            res.status(500).json({
                success: false,
                message: "There was an error processing your request. Please try again."
            });
        }
    }
);

// Validation for businessId in URL parameter (assuming slug)
const businessIdParamValidation = [
    param('businessId', 'Business ID in URL is required').notEmpty().trim().escape()
    // Use .isMongoId() if expecting ObjectId
];

// Validation for leadId in URL parameter (should be ObjectId)
const leadIdParamValidation = [
    param('leadId', 'Lead ID must be a valid MongoDB ObjectId').isMongoId()
];

// Validation for noteId in URL parameter (should be ObjectId)
const noteIdParamValidation = [
    param('noteId', 'Note ID must be a valid MongoDB ObjectId').isMongoId()
];

// Validation for creating a lead (POST /:businessId/)
const createLeadValidationRules = [
    body('name', 'Name is required').notEmpty().trim().escape(),
    body('phone', 'Phone number is required').notEmpty().trim().escape(), // Basic, add more specific phone validation if needed
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('message').optional().trim().escape(),
    body('serviceInterest').optional().trim().escape()
];

// Validation for updating lead status (PUT /:businessId/:leadId)
const updateLeadStatusValidationRules = [
    body('status', 'Status is required').notEmpty().trim().isIn(['new', 'attempted-contact', 'contacted', 'scheduled', 'completed', 'no-response']).withMessage('Invalid status value')
];

// Validation for adding a note (POST /:businessId/notes/:leadId)
const addNoteValidationRules = [
    body('note', 'Note content is required').notEmpty().trim().escape()
];

// General rate limiter for authenticated lead routes
const generalApiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // Limit each IP to 200 requests per windowMs
	message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply the general limiter to all routes in this file
router.use(generalApiLimiter);

// GET /leads/:businessId - Retrieve all leads for a specific business
router.get(
    "/:businessId", 
    authenticateToken, 
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner, 
    getLeads
);

// POST /leads/:businessId - Create a new lead 
router.post(
    "/:businessId",
    authenticateToken, 
    businessIdParamValidation,
    createLeadValidationRules,
    handleValidationErrors,
    checkBusinessOwner,
    createLeadHandler
);

// PUT /leads/:businessId/:leadId - Update the status of a lead
router.put(
    "/:businessId/:leadId", 
    authenticateToken, 
    businessIdParamValidation,
    leadIdParamValidation,
    updateLeadStatusValidationRules,
    handleValidationErrors,
    checkBusinessOwner, 
    updateLeadStatus
);

// POST /leads/:businessId/notes/:leadId - Add a note to a lead
router.post(
    "/:businessId/notes/:leadId", 
    authenticateToken, 
    businessIdParamValidation,
    leadIdParamValidation,
    addNoteValidationRules,
    handleValidationErrors,
    checkBusinessOwner, 
    addNoteForLeadController
);

// DELETE /leads/:businessId/notes/:leadId/:noteId - Remove a note from a lead
router.delete(
    "/:businessId/notes/:leadId/:noteId", 
    authenticateToken, 
    businessIdParamValidation,
    leadIdParamValidation,
    noteIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner, 
    removeNoteFromLeadController
);

export default router;
