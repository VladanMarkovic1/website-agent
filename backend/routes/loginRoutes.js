import express from 'express';
import { loginUser } from '../controllers/loginControllers/loginController.js';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Define validation rules for the login route
const loginValidationRules = [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').notEmpty()
];

// Rate limiter for login attempts
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 login requests per windowMs
	message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true, // Don't count successful logins towards the limit
});

// POST /login
// This endpoint authenticates a user and returns a JWT.
router.post(
    '/login',
    loginLimiter,
    loginValidationRules,
    handleValidationErrors,
    loginUser
);

export default router;