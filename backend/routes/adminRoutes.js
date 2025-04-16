import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { sendInvitation } from '../controllers/adminControllers/sendInvitation.js';
import { getBusinesses, getBusinessOwners } from '../controllers/adminControllers/businessOwnerController.js';
import { body, validationResult } from 'express-validator';

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

export default router;
