import express from 'express';
import smsProcessingService from '../services/smsProcessingService.js';
import twilioService from '../utils/twilioService.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Input validation middleware
const validateSMSInput = [
    body('MessageSid').isLength({ min: 34, max: 34 }).matches(/^SM[a-zA-Z0-9]{32}$/),
    body('From').isMobilePhone().normalizeEmail(),
    body('To').isMobilePhone().normalizeEmail(),
    body('Body').isLength({ min: 1, max: 1600 }).trim().escape(),
    body('AccountSid').optional().isLength({ min: 34, max: 34 }).matches(/^AC[a-zA-Z0-9]{32}$/),
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('❌ SMS webhook validation errors:', errors.array());
        return res.status(400).json({
            error: 'Invalid input data',
            details: errors.array()
        });
    }
    next();
};

// Twilio webhook validation middleware (same as voice)
const validateTwilioWebhook = (req, res, next) => {
    try {
        // In production, validate Twilio signature
        const twilioSignature = req.headers['x-twilio-signature'];
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        // For development/mock mode, allow through
        if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_AUTH_TOKEN) {
            console.log('🔓 SMS webhook validation bypassed (development mode)');
            return next();
        }

        // In production, validate signature
        const isValid = twilioService.validateWebhookSignature(
            twilioSignature,
            url,
            req.body
        );

        if (!isValid) {
            console.error('❌ Invalid Twilio SMS webhook signature');
            return res.status(403).json({ error: 'Invalid webhook signature' });
        }

        console.log('✅ Twilio SMS webhook signature validated');
        next();
    } catch (error) {
        console.error('❌ SMS webhook validation error:', error);
        res.status(500).json({ error: 'SMS webhook validation failed' });
    }
};

// Parse URL-encoded data from Twilio
router.use(express.urlencoded({ extended: true }));

/**
 * @route POST /api/webhooks/sms/incoming
 * @desc Handle incoming SMS webhook from Twilio
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/incoming', validateTwilioWebhook, validateSMSInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('📨 Incoming SMS webhook received:', req.body);

        // Extract Twilio SMS data
        const smsData = {
            MessageSid: req.body.MessageSid,
            From: req.body.From,
            To: req.body.To,
            Body: req.body.Body,
            NumMedia: req.body.NumMedia,
            MediaUrl0: req.body.MediaUrl0,
            MediaContentType0: req.body.MediaContentType0,
            AccountSid: req.body.AccountSid,
            SmsSid: req.body.SmsSid,
            SmsStatus: req.body.SmsStatus
        };

        // Validate required fields
        if (!smsData.MessageSid || !smsData.From || !smsData.To || !smsData.Body) {
            console.error('❌ Missing required SMS data:', smsData);
            return res.status(400).json({ 
                error: 'Missing required SMS fields',
                required: ['MessageSid', 'From', 'To', 'Body']
            });
        }

        // Check for media attachments
        if (smsData.NumMedia && parseInt(smsData.NumMedia) > 0) {
            console.log(`📎 SMS contains ${smsData.NumMedia} media attachments`);
            // Handle media if needed in future
        }

        // Process incoming SMS
        const result = await smsProcessingService.processIncomingSMS(smsData);

        if (result.success) {
            console.log('✅ SMS processed successfully:', {
                conversationId: result.conversationId,
                businessId: result.businessId,
                newConversation: result.newConversation
            });

            res.status(200).json({
                success: true,
                conversationId: result.conversationId,
                businessId: result.businessId,
                processed: true
            });
        } else {
            console.error('❌ SMS processing failed:', result.error);
            
            // Still return 200 to Twilio to prevent retries for business logic errors
            res.status(200).json({
                success: false,
                error: result.error,
                processed: false
            });
        }

    } catch (error) {
        console.error('❌ SMS webhook error:', error);
        
        // Return 500 only for system errors
        res.status(500).json({
            success: false,
            error: 'SMS processing system error',
            processed: false
        });
    }
});

/**
 * @route POST /api/webhooks/sms/status
 * @desc Handle SMS delivery status webhook from Twilio
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/status', validateTwilioWebhook, validateSMSInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('📊 SMS status update received:', req.body);

        // Extract status data
        const statusData = {
            MessageSid: req.body.MessageSid,
            MessageStatus: req.body.MessageStatus,
            To: req.body.To,
            From: req.body.From,
            ErrorCode: req.body.ErrorCode,
            ErrorMessage: req.body.ErrorMessage
        };

        // Validate required fields
        if (!statusData.MessageSid || !statusData.MessageStatus) {
            console.error('❌ Missing MessageSid or MessageStatus in status update');
            return res.status(400).json({ error: 'MessageSid and MessageStatus required' });
        }

        // Log status for monitoring
        const status = statusData.MessageStatus;
        const logMessage = `📱 SMS ${statusData.MessageSid}: ${status}`;
        
        if (status === 'delivered') {
            console.log(`✅ ${logMessage}`);
        } else if (status === 'failed' || status === 'undelivered') {
            console.error(`❌ ${logMessage} - Error: ${statusData.ErrorCode} ${statusData.ErrorMessage}`);
        } else {
            console.log(`📊 ${logMessage}`);
        }

        // TODO: Update SMS conversation with delivery status
        // const conversation = await SMSConversation.findOne({
        //     'messages.messageSid': statusData.MessageSid
        // });
        // if (conversation) {
        //     conversation.updateMessageStatus(statusData.MessageSid, status);
        // }

        res.status(200).json({
            success: true,
            messageSid: statusData.MessageSid,
            status: status
        });

    } catch (error) {
        console.error('❌ SMS status webhook error:', error);
        res.status(500).json({
            success: false,
            error: 'SMS status update failed'
        });
    }
});

/**
 * @route POST /api/webhooks/sms/fallback
 * @desc Handle SMS fallback webhook when primary webhook fails
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/fallback', validateTwilioWebhook, validateSMSInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('🚨 SMS fallback webhook triggered:', req.body);

        // Log the fallback for monitoring
        const fallbackData = {
            MessageSid: req.body.MessageSid,
            From: req.body.From,
            To: req.body.To,
            Body: req.body.Body,
            ErrorCode: req.body.ErrorCode,
            ErrorUrl: req.body.ErrorUrl
        };

        console.error('🚨 Primary SMS webhook failed:', fallbackData);

        // Try to process the SMS through fallback logic
        try {
            const result = await smsProcessingService.processIncomingSMS({
                MessageSid: fallbackData.MessageSid,
                From: fallbackData.From,
                To: fallbackData.To,
                Body: fallbackData.Body,
                AccountSid: req.body.AccountSid
            });

            if (result.success) {
                console.log('✅ SMS processed via fallback:', result.conversationId);
            } else {
                console.error('❌ Fallback SMS processing also failed:', result.error);
            }
        } catch (fallbackError) {
            console.error('❌ Fallback processing error:', fallbackError);
        }

        // Always return success to prevent Twilio retry loops
        res.status(200).json({
            success: true,
            fallback: true,
            message: 'Fallback webhook processed'
        });

    } catch (error) {
        console.error('❌ SMS fallback webhook error:', error);
        res.status(200).json({
            success: false,
            fallback: true,
            error: 'Fallback processing failed'
        });
    }
});

/**
 * @route GET /api/webhooks/sms/health
 * @desc Health check for SMS webhook system
 * @access Public
 */
router.get('/health', async (req, res) => {
    try {
        const health = await smsProcessingService.healthCheck();
        
        res.status(health.status === 'healthy' ? 200 : 503).json({
            service: 'SMS Webhooks',
            status: health.status,
            timestamp: health.timestamp,
            checks: health.checks
        });

    } catch (error) {
        console.error('❌ SMS webhook health check error:', error);
        res.status(500).json({
            service: 'SMS Webhooks',
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 