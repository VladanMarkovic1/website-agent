import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { sendInvitation } from '../controllers/adminControllers/sendInvitation.js';
import { 
    getBusinesses, 
    getBusinessOwners,
    deleteBusinessOwner,
    updateBusinessOwner,
    generateScriptTag,
    generateApiKey
} from '../controllers/adminControllers/businessOwnerController.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in adminRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Rate limiting for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply security middleware
router.use(authenticateToken);  // Verify JWT token
router.use(adminAuth);         // Verify admin role
router.use(adminLimiter);      // Apply rate limiting

// Validation rules for sending an invitation
const inviteValidationRules = [
    body('email', 'Please provide a valid email address').isEmail().normalizeEmail(),
    body('businessId', 'Business ID is required').notEmpty().trim().escape() // Assuming slug
    // Use .isMongoId() if expecting ObjectId
];

// Validation rules for updating a business owner
const updateOwnerValidationRules = [
    param('ownerId', 'Valid Owner ID parameter is required').isMongoId(),
    body('businessId', 'New Business ID is required').notEmpty().trim().escape()
];

// Validation rules for deleting a business owner
const deleteOwnerValidationRules = [
    param('email', 'Valid Email parameter is required').isEmail().normalizeEmail()
];

// Validation rules for generating script tag
const scriptTagValidationRules = [
    param('businessId', 'Business ID parameter is required').notEmpty().trim().escape()
];

// Validation rules for generating API key
const apiKeyValidationRules = [
    param('businessId', 'Business ID parameter is required').notEmpty().trim().escape()
];

// Get all businesses (admin only) - No validation needed for input
router.get('/businesses', getBusinesses);

// Get all business owners (admin only) - No validation needed for input
router.get('/business-owners', getBusinessOwners);

// Send invitation (admin only)
router.post(
    '/invite', 
    inviteValidationRules, // Apply validation
    handleValidationErrors, // Handle errors
    sendInvitation         // Call controller
);

// Delete a business owner invitation (admin only)
router.delete(
    '/business-owners/:email',
    deleteOwnerValidationRules, // Apply validation
    handleValidationErrors,     // Handle errors
    deleteBusinessOwner         // Call controller
);

// Update a business owner assignment (admin only)
router.put(
    '/business-owners/:ownerId',
    updateOwnerValidationRules, // Apply validation
    handleValidationErrors,     // Handle errors
    updateBusinessOwner         // Call controller
);

// Generate script tag for a business (admin only)
router.get(
    '/script-tag/:businessId',
    scriptTagValidationRules,  // Apply validation
    handleValidationErrors,    // Handle errors
    generateScriptTag          // Call controller
);

// Generate API Key for a business (admin only)
router.post(
    '/api-key/:businessId',
    apiKeyValidationRules,    // Apply validation
    handleValidationErrors,   // Handle errors
    generateApiKey            // Call controller
);

export default router;
