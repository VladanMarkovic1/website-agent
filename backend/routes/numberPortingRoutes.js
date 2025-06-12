import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validateCSRFToken } from '../middleware/csrfProtection.js';
import numberPortingService from '../utils/numberPortingService.js';

const router = express.Router();

/**
 * @route POST /api/number-porting/setup/ported
 * @desc Set up ported number for business (Option A)
 * @access Private (Admin only)
 * @security JWT + Admin Auth
 */
router.post('/setup/ported', authenticateToken, adminAuth, validateCSRFToken, async (req, res) => {
    try {
        const { businessId, portedNumber, originalCarrier, forwardingNumber } = req.body;

        console.log(`📞 Admin setting up ported number for ${businessId}`);

        // Validate required fields
        if (!businessId || !portedNumber || !forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: 'Business ID, ported number, and forwarding number are required'
            });
        }

        // Setup ported number
        const result = await numberPortingService.setupPortedNumber(
            businessId,
            portedNumber,
            originalCarrier,
            forwardingNumber
        );

        res.status(201).json({
            success: true,
            message: 'Ported number setup completed successfully',
            result,
            adminUser: req.adminUser.email
        });

    } catch (error) {
        console.error('❌ Ported number setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to setup ported number'
        });
    }
});

/**
 * @route POST /api/number-porting/setup/tracking
 * @desc Set up new tracking number for business (Option B)
 * @access Private (Admin only)
 * @security JWT + Admin Auth
 */
router.post('/setup/tracking', authenticateToken, adminAuth, validateCSRFToken, async (req, res) => {
    try {
        const { businessId, forwardingNumber, preferredAreaCode } = req.body;

        console.log(`📞 Admin setting up tracking number for ${businessId}`);

        // Validate required fields
        if (!businessId || !forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: 'Business ID and forwarding number are required'
            });
        }

        // Setup tracking number
        const result = await numberPortingService.setupTrackingNumber(
            businessId,
            forwardingNumber,
            preferredAreaCode
        );

        res.status(201).json({
            success: true,
            message: 'Tracking number setup completed successfully',
            result,
            adminUser: req.adminUser.email
        });

    } catch (error) {
        console.error('❌ Tracking number setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to setup tracking number'
        });
    }
});

/**
 * @route POST /api/number-porting/setup/hybrid
 * @desc Set up hybrid numbers for business (Option C)
 * @access Private (Admin only)
 * @security JWT + Admin Auth
 */
router.post('/setup/hybrid', authenticateToken, adminAuth, validateCSRFToken, async (req, res) => {
    try {
        const { businessId, businessRealNumber, forwardingNumber, preferredAreaCode } = req.body;

        console.log(`📞 Admin setting up hybrid numbers for ${businessId}`);

        // Validate required fields
        if (!businessId || !businessRealNumber || !forwardingNumber) {
            return res.status(400).json({
                success: false,
                error: 'Business ID, business real number, and forwarding number are required'
            });
        }

        // Setup hybrid numbers
        const result = await numberPortingService.setupHybridNumbers(
            businessId,
            businessRealNumber,
            forwardingNumber,
            preferredAreaCode
        );

        res.status(201).json({
            success: true,
            message: 'Hybrid number setup completed successfully',
            result,
            adminUser: req.adminUser.email
        });

    } catch (error) {
        console.error('❌ Hybrid number setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to setup hybrid numbers'
        });
    }
});

/**
 * @route GET /api/number-porting/business/:businessId/setup
 * @desc Get number setup information for business
 * @access Private (Business Owner or Admin)
 * @security JWT + Business Owner Check
 */
router.get('/business/:businessId/setup', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;

        console.log(`📞 Getting number setup for ${businessId}`);

        const setupInfo = await numberPortingService.getBusinessNumberSetup(businessId);

        res.status(200).json({
            success: true,
            setupInfo,
            businessId
        });

    } catch (error) {
        console.error('❌ Get setup info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve setup information'
        });
    }
});

/**
 * @route GET /api/number-porting/admin/all-setups
 * @desc List all business number setups (Admin only)
 * @access Private (Admin only)
 * @security JWT + Admin Auth
 */
router.get('/admin/all-setups', authenticateToken, adminAuth, async (req, res) => {
    try {
        console.log('📞 Admin listing all business setups');

        const allSetups = await numberPortingService.listAllBusinessSetups();

        res.status(200).json({
            success: true,
            totalBusinesses: allSetups.length,
            setups: allSetups,
            adminUser: req.adminUser.email
        });

    } catch (error) {
        console.error('❌ List all setups error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list business setups'
        });
    }
});

/**
 * @route GET /api/number-porting/admin/ported-numbers
 * @desc Get all ported numbers (Admin only)
 * @access Private (Admin only)
 * @security JWT + Admin Auth
 */
router.get('/admin/ported-numbers', authenticateToken, adminAuth, async (req, res) => {
    try {
        console.log('📞 Admin getting all ported numbers');

        // This would be implemented in PhoneSettings model
        const portedNumbers = await numberPortingService.getPortedNumbers();

        res.status(200).json({
            success: true,
            totalPorted: portedNumbers.length,
            portedNumbers,
            adminUser: req.adminUser.email
        });

    } catch (error) {
        console.error('❌ Get ported numbers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve ported numbers'
        });
    }
});

/**
 * @route GET /api/number-porting/setup-options
 * @desc Get available setup options and descriptions
 * @access Private (Authenticated users)
 * @security JWT
 */
router.get('/setup-options', authenticateToken, async (req, res) => {
    try {
        const setupOptions = [
            {
                option: 'A',
                name: 'Number Porting',
                title: 'Keep Your Existing Number',
                description: 'Transfer your current business number to our system. Customers continue calling the same number they always have.',
                benefits: [
                    'No marketing changes needed',
                    'Seamless customer experience', 
                    'Zero disruption to existing customers',
                    'Professional appearance'
                ],
                process: [
                    'We initiate the port from your current carrier',
                    'Number transfers to Twilio (1-3 business days)',
                    'All calls now route through our tracking system',
                    'Missed calls automatically trigger SMS follow-up'
                ],
                bestFor: 'Established businesses with existing marketing materials',
                cost: '$25 one-time porting fee + $1/month + usage',
                recommended: true
            },
            {
                option: 'B',
                name: 'New Tracking Number',
                title: 'Get a New Professional Number',
                description: 'We provide a new local phone number with full call tracking and SMS capabilities.',
                benefits: [
                    'Full call tracking from day one',
                    'Professional local number',
                    'Complete SMS automation',
                    'Detailed analytics'
                ],
                process: [
                    'We purchase a local number in your area code',
                    'Update your marketing materials with new number',
                    'Calls route through our tracking system',
                    'Missed calls trigger automatic SMS follow-up'
                ],
                bestFor: 'New businesses or those wanting a fresh start',
                cost: '$1/month + usage',
                recommended: false
            },
            {
                option: 'C',
                name: 'Hybrid Setup',
                title: 'Both Numbers Working Together',
                description: 'Keep your existing number for current customers while using a tracking number for new marketing.',
                benefits: [
                    'Gradual transition approach',
                    'Test marketing effectiveness',
                    'No disruption to existing customers',
                    'Track new vs. existing customer sources'
                ],
                process: [
                    'Keep your existing number unchanged',
                    'We provide a new tracking number',
                    'Use tracking number in new campaigns',
                    'Both numbers can trigger SMS follow-up'
                ],
                bestFor: 'Businesses wanting to test the system gradually',
                cost: 'Current phone costs + $1/month + usage',
                recommended: false
            }
        ];

        res.status(200).json({
            success: true,
            setupOptions,
            totalOptions: setupOptions.length
        });

    } catch (error) {
        console.error('❌ Setup options error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve setup options'
        });
    }
});

/**
 * @route GET /api/number-porting/health
 * @desc Health check for number porting service
 * @access Public
 */
router.get('/health', async (req, res) => {
    try {
        const health = await numberPortingService.healthCheck();
        
        res.status(health.status === 'healthy' ? 200 : 503).json({
            service: 'Number Porting',
            status: health.status,
            timestamp: health.timestamp,
            checks: health.checks
        });

    } catch (error) {
        console.error('❌ Number porting health check error:', error);
        res.status(500).json({
            service: 'Number Porting',
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 