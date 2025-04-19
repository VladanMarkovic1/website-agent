import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import { 
    getWidgetSettings,
    updateWidgetSettings
} from '../controllers/clientControllers/settingsController.js';
import { body, param, validationResult } from 'express-validator';

const router = express.Router();

// Reusable validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in clientRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules for client ID (assuming slug)
const clientIdParamValidation = [
    param('clientId', 'Client ID parameter is required').notEmpty().trim().escape()
    // Use .isMongoId() if expecting ObjectId
];

// Validation rules for updating settings
const updateSettingsValidationRules = [
    body('widgetConfig.primaryColor').optional().isHexColor().withMessage('Invalid primary color hex code'),
    body('widgetConfig.position').optional().isIn(['bottom-right', 'bottom-left']).withMessage('Invalid position'),
    body('widgetConfig.welcomeMessage').optional().trim().escape()
];

// --- Widget Settings Routes --- (Business Owner Access)

// GET /api/v1/clients/:clientId/settings - Get widget settings for a business
router.get(
    '/:clientId/settings',
    authenticateToken,
    clientIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner, // Ensures user owns this clientId
    getWidgetSettings
);

// PUT /api/v1/clients/:clientId/settings - Update widget settings for a business
router.put(
    '/:clientId/settings',
    authenticateToken,
    clientIdParamValidation,
    updateSettingsValidationRules,
    handleValidationErrors,
    checkBusinessOwner, // Ensures user owns this clientId
    updateWidgetSettings
);

export default router; 