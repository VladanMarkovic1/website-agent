import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import { body, param, validationResult } from 'express-validator';
import Business from '../models/Business.js';
import Service from '../models/Service.js';
import ExtraInfo from '../models/ExtraInfo.js';
import BusinessKnowledge from '../models/BusinessKnowledge.js';
import Contact from '../models/Contact.js';

const router = express.Router();

// Reusable validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors in businessRoutes:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation rules for business ID
const businessIdParamValidation = [
    param('businessId', 'Business ID parameter is required').notEmpty().trim().escape()
];

// Validation rules for business profile updates
const businessProfileValidation = [
    body('businessName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be between 2 and 100 characters'),
    body('businessDescription').optional().trim().isLength({ max: 2000 }).withMessage('Business description must be less than 2000 characters'),
    body('mission').optional().trim().isLength({ max: 500 }).withMessage('Mission must be less than 500 characters'),
    body('vision').optional().trim().isLength({ max: 500 }).withMessage('Vision must be less than 500 characters'),
    body('specializations').optional().isArray().withMessage('Specializations must be an array'),
    body('specializations.*').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Each specialization must be between 2 and 50 characters'),
    body('yearsInBusiness').optional().isInt({ min: 0, max: 100 }).withMessage('Years in business must be between 0 and 100'),
    body('certifications').optional().isArray().withMessage('Certifications must be an array'),
    body('awards').optional().isArray().withMessage('Awards must be an array'),
    body('teamMembers').optional().isArray().withMessage('Team members must be an array'),
    body('teamMembers.*.name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team member name must be between 2 and 100 characters'),
    body('teamMembers.*.role').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Team member role must be between 2 and 100 characters'),
    body('insurancePartners').optional().isArray().withMessage('Insurance partners must be an array'),
    body('paymentOptions').optional().isArray().withMessage('Payment options must be an array'),
    body('businessTone').optional().isIn(['professional', 'friendly', 'casual', 'formal', 'caring']).withMessage('Invalid business tone'),
    body('communicationStyle').optional().isIn(['direct', 'empathetic', 'educational', 'conversational']).withMessage('Invalid communication style'),
    body('timezone').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Timezone must be between 3 and 50 characters')
];

// Validation rules for location details
const locationDetailsValidation = [
    body('locationDetails.address').optional().trim().isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
    body('locationDetails.city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
    body('locationDetails.state').optional().trim().isLength({ max: 50 }).withMessage('State must be less than 50 characters'),
    body('locationDetails.zipCode').optional().trim().isLength({ max: 20 }).withMessage('ZIP code must be less than 20 characters'),
    body('locationDetails.parking').optional().trim().isLength({ max: 200 }).withMessage('Parking info must be less than 200 characters'),
    body('locationDetails.accessibility').optional().trim().isLength({ max: 200 }).withMessage('Accessibility info must be less than 200 characters'),
    body('locationDetails.publicTransport').optional().trim().isLength({ max: 200 }).withMessage('Public transport info must be less than 200 characters'),
    body('locationDetails.landmarks').optional().trim().isLength({ max: 200 }).withMessage('Landmarks must be less than 200 characters')
];

// Validation rules for business hours
const businessHoursValidation = [
    body('businessHours.*.open').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
    body('businessHours.*.close').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
    body('businessHours.*.closed').optional().isBoolean().withMessage('Closed must be a boolean')
];

// Validation rules for AI configuration
const aiConfigValidation = [
    body('aiConfig.model').optional().isIn(['gpt-4', 'gpt-3.5-turbo']).withMessage('Invalid AI model'),
    body('aiConfig.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
    body('aiConfig.maxTokens').optional().isInt({ min: 50, max: 2000 }).withMessage('Max tokens must be between 50 and 2000'),
    body('aiConfig.includeBusinessContext').optional().isBoolean().withMessage('Include business context must be a boolean'),
    body('aiConfig.includeServiceDetails').optional().isBoolean().withMessage('Include service details must be a boolean'),
    body('aiConfig.includeTeamInfo').optional().isBoolean().withMessage('Include team info must be a boolean'),
    body('aiConfig.includeTestimonials').optional().isBoolean().withMessage('Include testimonials must be a boolean')
];

// GET /api/v1/business/:businessId/profile - Get complete business profile
router.get(
    '/:businessId/profile',
    authenticateToken,
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner,
    async (req, res) => {
        try {
            const { businessId } = req.params;
            
            const business = await Business.findOne({ businessId });
            if (!business) {
                return res.status(404).json({ error: 'Business not found' });
            }

            // Get related data
            const [services, extraInfo, knowledge, contact] = await Promise.all([
                Service.findOne({ businessId }),
                ExtraInfo.findOne({ businessId }),
                BusinessKnowledge.findOne({ businessId }),
                Contact.findOne({ businessId })
            ]);

            const profile = {
                // Basic business info
                businessId: business.businessId,
                businessName: business.businessName,
                websiteUrl: business.websiteUrl,
                notificationEmail: business.notificationEmail,
                
                // Enhanced business profile
                businessDescription: business.businessDescription,
                mission: business.mission,
                vision: business.vision,
                specializations: business.specializations,
                yearsInBusiness: business.yearsInBusiness,
                certifications: business.certifications,
                awards: business.awards,
                teamMembers: business.teamMembers,
                insurancePartners: business.insurancePartners,
                paymentOptions: business.paymentOptions,
                emergencyProtocol: business.emergencyProtocol,
                
                // Location and hours
                locationDetails: business.locationDetails,
                businessHours: business.businessHours,
                timezone: business.timezone,
                
                // Business personality
                businessTone: business.businessTone,
                communicationStyle: business.communicationStyle,
                
                // Widget configuration
                widgetConfig: business.widgetConfig,
                
                // AI configuration
                aiConfig: business.aiConfig,
                
                // Related data
                services: services?.services || [],
                extraInfo: extraInfo || {},
                knowledge: knowledge || {},
                contact: contact || {}
            };

            res.json(profile);
            
        } catch (error) {
            console.error('Error fetching business profile:', error);
            res.status(500).json({ error: 'Failed to fetch business profile' });
        }
    }
);

// PUT /api/v1/business/:businessId/profile - Update complete business profile
router.put(
    '/:businessId/profile',
    authenticateToken,
    businessIdParamValidation,
    businessProfileValidation,
    locationDetailsValidation,
    businessHoursValidation,
    aiConfigValidation,
    handleValidationErrors,
    checkBusinessOwner,
    async (req, res) => {
        try {
            const { businessId } = req.params;
            const updateData = req.body;
            
            const business = await Business.findOne({ businessId });
            if (!business) {
                return res.status(404).json({ error: 'Business not found' });
            }

            // Update business fields
            const businessUpdateFields = [
                'businessName', 'businessDescription', 'mission', 'vision',
                'specializations', 'yearsInBusiness', 'certifications', 'awards',
                'teamMembers', 'insurancePartners', 'paymentOptions', 'emergencyProtocol',
                'businessTone', 'communicationStyle', 'timezone'
            ];

            businessUpdateFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    business[field] = updateData[field];
                }
            });

            // Update location details
            if (updateData.locationDetails) {
                business.locationDetails = {
                    ...business.locationDetails,
                    ...updateData.locationDetails
                };
            }

            // Update business hours
            if (updateData.businessHours) {
                business.businessHours = {
                    ...business.businessHours,
                    ...updateData.businessHours
                };
            }

            // Update AI configuration
            if (updateData.aiConfig) {
                business.aiConfig = {
                    ...business.aiConfig,
                    ...updateData.aiConfig
                };
            }

            await business.save();

            res.json({ 
                message: 'Business profile updated successfully',
                business: {
                    businessId: business.businessId,
                    businessName: business.businessName,
                    businessDescription: business.businessDescription,
                    specializations: business.specializations,
                    teamMembers: business.teamMembers
                }
            });
            
        } catch (error) {
            console.error('Error updating business profile:', error);
            res.status(500).json({ error: 'Failed to update business profile' });
        }
    }
);

// GET /api/v1/business/:businessId/context - Get business context for AI
router.get(
    '/:businessId/context',
    authenticateToken,
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner,
    async (req, res) => {
        try {
            const { businessId } = req.params;
            
            const business = await Business.findOne({ businessId });
            if (!business) {
                return res.status(404).json({ error: 'Business not found' });
            }

            // Get related data for context
            const [services, extraInfo, knowledge, contact] = await Promise.all([
                Service.findOne({ businessId }),
                ExtraInfo.findOne({ businessId }),
                BusinessKnowledge.findOne({ businessId }),
                Contact.findOne({ businessId })
            ]);

            const context = {
                business: {
                    name: business.businessName,
                    description: business.businessDescription,
                    specializations: business.specializations,
                    yearsInBusiness: business.yearsInBusiness,
                    teamMembers: business.teamMembers,
                    tone: business.businessTone,
                    communicationStyle: business.communicationStyle,
                    hours: business.getFormattedHours(),
                    location: business.locationDetails
                },
                services: services?.services || [],
                extraInfo: extraInfo || {},
                knowledge: knowledge || {},
                contact: contact || {},
                aiConfig: business.aiConfig
            };

            res.json(context);
            
        } catch (error) {
            console.error('Error fetching business context:', error);
            res.status(500).json({ error: 'Failed to fetch business context' });
        }
    }
);

// GET /api/v1/business/:businessId/validation - Get data quality validation
router.get(
    '/:businessId/validation',
    authenticateToken,
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner,
    async (req, res) => {
        try {
            const { businessId } = req.params;
            
            // Import the validation service
            const dataValidationService = (await import('../services/dataValidationService.js')).default;
            
            const validationResults = await dataValidationService.validateBusinessProfile(businessId);
            
            res.json(validationResults);
            
        } catch (error) {
            console.error('Error validating business data:', error);
            res.status(500).json({ error: 'Failed to validate business data' });
        }
    }
);

// POST /api/v1/business/:businessId/populate - Populate missing data with defaults
router.post(
    '/:businessId/populate',
    authenticateToken,
    businessIdParamValidation,
    handleValidationErrors,
    checkBusinessOwner,
    async (req, res) => {
        try {
            const { businessId } = req.params;
            
            // Import the population service
            const enhancedDataPopulator = (await import('../scripts/populateEnhancedData.js')).default;
            
            const results = await enhancedDataPopulator.populateEnhancedData(businessId);
            
            res.json({ 
                message: 'Business data populated successfully',
                results 
            });
            
        } catch (error) {
            console.error('Error populating business data:', error);
            res.status(500).json({ error: 'Failed to populate business data' });
        }
    }
);

export default router; 