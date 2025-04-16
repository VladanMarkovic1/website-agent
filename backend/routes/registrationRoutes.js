import express from 'express';
import { registerUser } from '../controllers/registrationControllers/registrationController.js';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit'; // Import rate-limit

const router = express.Router();

// Reusable Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Define validation rules for the registration route
const registrationValidationRules = [
    body('token', 'Invitation token is required').notEmpty().isHexadecimal().isLength({ min: 64, max: 64 }), // Assuming 32 bytes hex
    body('name', 'Name is required').notEmpty().trim().escape(),
    body('password', 'Password must be at least 6 characters long').isLength({ min: 6 })
];

// Rate limiter for registration attempts
const registrationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 5, // Limit each IP to 5 registration requests per hour
	message: 'Too many registration attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /register
// This endpoint allows a user to register using an invitation token.
router.post(
    '/register',
    registrationLimiter, // Apply rate limiting first
    registrationValidationRules, // Apply validation rules
    handleValidationErrors,      // Handle potential errors
    registerUser
);

export default router;