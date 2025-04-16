import express from "express";
import { getLeads } from '../controllers/leadControllers/getLeadsController.js';
import { createLeadHandler } from '../controllers/leadControllers/leadController.js';
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

// Validation for creating a lead (POST /)
const createLeadValidationRules = [
    body('businessId', 'Business ID is required').notEmpty().trim().escape(), // Assuming slug
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

// POST /leads - Create a new lead (Using createLeadHandler from leadController.js?)
router.post(
    "/", 
    authenticateToken, 
    createLeadValidationRules, // Apply validation rules
    handleValidationErrors,
    createLeadHandler // Assumes this handler checks validation results
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
