import express from 'express';
import callHandlingService from '../services/callHandlingService.js';
import twilioService from '../utils/twilioService.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Input validation middleware for voice webhooks
const validateVoiceInput = [
    body('CallSid').isLength({ min: 34, max: 34 }).matches(/^CA[a-zA-Z0-9]{32}$/),
    body('From').isMobilePhone(),
    body('To').isMobilePhone(),
    body('CallStatus').isIn(['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']),
    body('Direction').isIn(['inbound', 'outbound-api', 'outbound-dial']),
    body('AccountSid').optional().isLength({ min: 34, max: 34 }).matches(/^AC[a-zA-Z0-9]{32}$/),
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('❌ Voice webhook validation errors:', errors.array());
        return res.status(400).type('text/xml').send(`
            <Response>
                <Say>Invalid request format. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
    next();
};

// Twilio webhook validation middleware
const validateTwilioWebhook = (req, res, next) => {
    try {
        // In production, validate Twilio signature
        const twilioSignature = req.headers['x-twilio-signature'];
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        // For development/mock mode, allow through
        if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_AUTH_TOKEN) {
            console.log('🔓 Twilio webhook validation bypassed (development mode)');
            return next();
        }

        // In production, validate signature
        const isValid = twilioService.validateWebhookSignature(
            twilioSignature,
            url,
            req.body
        );

        if (!isValid) {
            console.error('❌ Invalid Twilio webhook signature');
            return res.status(403).json({ error: 'Invalid webhook signature' });
        }

        console.log('✅ Twilio webhook signature validated');
        next();
    } catch (error) {
        console.error('❌ Webhook validation error:', error);
        res.status(500).json({ error: 'Webhook validation failed' });
    }
};

// Parse URL-encoded data from Twilio
router.use(express.urlencoded({ extended: true }));

/**
 * @route POST /api/webhooks/voice/incoming
 * @desc Handle incoming call webhook from Twilio
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/incoming', validateTwilioWebhook, validateVoiceInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('📞 Incoming call webhook received:', req.body);

        // Extract Twilio call data
        const callData = {
            CallSid: req.body.CallSid,
            From: req.body.From,
            To: req.body.To,
            CallStatus: req.body.CallStatus,
            Direction: req.body.Direction,
            CallerName: req.body.CallerName,
            ForwardedFrom: req.body.ForwardedFrom,
            AccountSid: req.body.AccountSid
        };

        // Validate required fields
        if (!callData.CallSid || !callData.From || !callData.To) {
            console.error('❌ Missing required call data:', callData);
            return res.status(400).type('text/xml').send(`
                <Response>
                    <Say>We're experiencing technical difficulties. Please try again later.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // Process incoming call
        const result = await callHandlingService.handleIncomingCall(callData);

        if (result.success) {
            console.log('✅ Call processed successfully:', result.callLogId);
            // Return TwiML for call forwarding
            res.type('text/xml').send(result.twiml);
        } else {
            console.error('❌ Call processing failed:', result.error);
            // Return error TwiML
            res.type('text/xml').send(result.twiml || `
                <Response>
                    <Say>We're unable to connect your call right now. Please try again later.</Say>
                    <Hangup/>
                </Response>
            `);
        }

    } catch (error) {
        console.error('❌ Voice webhook error:', error);
        res.status(500).type('text/xml').send(`
            <Response>
                <Say>We're experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * @route POST /api/webhooks/voice/status
 * @desc Handle call status update webhook from Twilio
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/status', validateTwilioWebhook, validateVoiceInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('📊 Call status update received:', req.body);

        // Extract status data
        const statusData = {
            CallSid: req.body.CallSid,
            CallStatus: req.body.CallStatus,
            CallDuration: req.body.CallDuration,
            DialCallStatus: req.body.DialCallStatus,
            DialCallDuration: req.body.DialCallDuration,
            RecordingUrl: req.body.RecordingUrl,
            TranscriptionText: req.body.TranscriptionText
        };

        // Validate required fields
        if (!statusData.CallSid) {
            console.error('❌ Missing CallSid in status update');
            return res.status(400).json({ error: 'CallSid required' });
        }

        // Process status update
        const result = await callHandlingService.handleCallStatusUpdate(statusData);

        if (result.success) {
            console.log(`✅ Status update processed: ${statusData.CallStatus} (Missed: ${result.isMissedCall})`);
            res.status(200).json({
                success: true,
                callLogId: result.callLogId,
                missedCall: result.isMissedCall
            });
        } else {
            console.error('❌ Status update failed:', result.error);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Status webhook error:', error);
        res.status(500).json({
            success: false,
            error: 'Status update processing failed'
        });
    }
});

/**
 * @route POST /api/webhooks/voice/recording
 * @desc Handle voicemail recording webhook from Twilio
 * @access Public (Twilio only)
 * @security Twilio signature validation
 */
router.post('/recording', validateTwilioWebhook, validateVoiceInput, handleValidationErrors, async (req, res) => {
    try {
        console.log('🎤 Voicemail recording received:', req.body);

        // Extract recording data
        const recordingData = {
            CallSid: req.body.CallSid,
            RecordingSid: req.body.RecordingSid,
            RecordingUrl: req.body.RecordingUrl,
            RecordingDuration: req.body.RecordingDuration,
            TranscriptionText: req.body.TranscriptionText,
            TranscriptionStatus: req.body.TranscriptionStatus
        };

        // Validate required fields
        if (!recordingData.CallSid || !recordingData.RecordingUrl) {
            console.error('❌ Missing required recording data');
            return res.status(400).json({ error: 'CallSid and RecordingUrl required' });
        }

        // Process voicemail
        const result = await callHandlingService.handleVoicemail(recordingData);

        if (result.success) {
            console.log('✅ Voicemail processed successfully:', result.callLogId);
            res.status(200).json({
                success: true,
                callLogId: result.callLogId,
                transcription: result.transcription
            });
        } else {
            console.error('❌ Voicemail processing failed:', result.error);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Recording webhook error:', error);
        res.status(500).json({
            success: false,
            error: 'Voicemail processing failed'
        });
    }
});

/**
 * @route GET /api/webhooks/voice/health
 * @desc Health check for voice webhook system
 * @access Public
 */
router.get('/health', async (req, res) => {
    try {
        const health = await callHandlingService.healthCheck();
        
        res.status(health.status === 'healthy' ? 200 : 503).json({
            service: 'Voice Webhooks',
            status: health.status,
            timestamp: health.timestamp,
            checks: health.checks
        });

    } catch (error) {
        console.error('❌ Voice webhook health check error:', error);
        res.status(500).json({
            service: 'Voice Webhooks',
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 