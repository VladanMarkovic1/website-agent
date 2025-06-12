import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';
import callHandlingService from '../services/callHandlingService.js';
import smsProcessingService from '../services/smsProcessingService.js';
import leadIntegrationService from '../services/leadIntegrationService.js';
import CallLog from '../models/CallLog.js';
import SMSConversation from '../models/SMSConversation.js';
import PhoneSettings from '../models/PhoneSettings.js';
import { maskSensitiveData, maskPhoneNumber } from '../utils/dataPrivacy.js';
import { validateCSRFToken, getCSRFToken } from '../middleware/csrfProtection.js';
import { logDataAccess, logSMSEvent, logPhoneAccess } from '../utils/securityLogger.js';

const router = express.Router();

// Rate limiter for call tracking API
const callTrackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // More generous for dashboard usage
    message: 'Too many call tracking requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// More restrictive rate limiter for SMS sending
const smsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 SMS per minute max
    message: 'Too many SMS requests, please wait before sending more messages',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiting to all routes
router.use(callTrackingLimiter);

/**
 * @route GET /api/call-tracking/csrf-token
 * @desc Get CSRF token for state-changing operations
 * @access Private (Authenticated)
 * @security JWT Authentication
 */
router.get('/csrf-token', authenticateToken, getCSRFToken);

/**
 * @route GET /api/call-tracking/:businessId/analytics
 * @desc Get call tracking analytics for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/analytics', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { timeframe = '7d' } = req.query;

        // Validate timeframe parameter with stricter regex
        const validTimeframes = ['1d', '7d', '30d', '90d'];
        const timeframeRegex = /^(1d|7d|30d|90d)$/;
        
        if (!validTimeframes.includes(timeframe) || !timeframeRegex.test(timeframe)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid timeframe. Valid options: 1d, 7d, 30d, 90d'
            });
        }

        console.log(`📊 Getting call analytics for ${businessId}, timeframe: ${timeframe}`);

        // Get call analytics
        const callAnalytics = await callHandlingService.getCallAnalytics(businessId, timeframe);
        
        // Get SMS conversation summary
        const smsAnalytics = await smsProcessingService.getConversationSummary(businessId, timeframe);
        
        // Get lead analytics
        const leadAnalytics = await leadIntegrationService.getLeadAnalytics(businessId, timeframe);

        // Combine analytics
        const analytics = {
            timeframe,
            businessId,
            calls: callAnalytics,
            sms: smsAnalytics,
            leads: leadAnalytics,
            summary: {
                totalTouchpoints: callAnalytics.totalCalls + smsAnalytics.total,
                conversionRate: leadAnalytics.conversionMetrics.missedCallsToLeads,
                revenue: {
                    potentialLost: callAnalytics.missedCalls * 1500, // Avg $1500 per missed call
                    recovered: leadAnalytics.totalLeads * 1500,
                    recoveryRate: Math.round((leadAnalytics.totalLeads / callAnalytics.missedCalls) * 100) || 0
                }
            }
        };

        res.status(200).json({
            success: true,
            analytics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Analytics error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analytics'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/recent-calls
 * @desc Get recent calls for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/recent-calls', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { limit = 20, missed_only = false } = req.query;

        console.log(`📞 Getting recent calls for ${businessId}`);

        // Log phone data access
        logPhoneAccess('VIEW_CALLS', null, req);

        const query = { businessId };
        if (missed_only === 'true') {
            query.isMissedCall = true;
        }

        const calls = await CallLog.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format calls for dashboard with privacy masking
        const formattedCalls = calls.map(call => ({
            callId: call._id,
            callerNumber: maskPhoneNumber(call.formattedCallerNumber),
            trackingNumber: call.trackingNumber, // Business number - don't mask
            businessDisplayNumber: call.businessDisplayNumber, // Business number - don't mask
            callTime: call.callStartTime,
            duration: call.callDuration,
            status: call.callStatus,
            isMissedCall: call.isMissedCall,
            smsTriggered: call.smsTriggered,
            smsResponse: call.smsResponse,
            leadCreated: call.leadCreated,
            numberSetupType: call.numberSetupType,
            isPortedNumber: call.isPortedNumber,
            timeAgo: getTimeAgo(call.callStartTime)
        }));

        res.status(200).json({
            success: true,
            calls: formattedCalls,
            totalCalls: formattedCalls.length,
            businessId
        });

    } catch (error) {
        console.error('❌ Recent calls error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve recent calls'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/missed-calls
 * @desc Get recent missed calls for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/missed-calls', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { limit = 20 } = req.query;

        console.log(`📞❌ Getting missed calls for ${businessId}`);

        const missedCalls = await callHandlingService.getRecentMissedCalls(businessId, parseInt(limit));

        res.status(200).json({
            success: true,
            missedCalls,
            totalMissed: missedCalls.length,
            businessId
        });

    } catch (error) {
        console.error('❌ Missed calls error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve missed calls'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/conversations
 * @desc Get SMS conversations for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/conversations', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { limit = 20, status = 'all' } = req.query;

        console.log(`💬 Getting SMS conversations for ${businessId}`);

        // Log sensitive data access
        logDataAccess('SMS_CONVERSATIONS', 'VIEW', { businessId }, req);

        const query = { businessId };
        if (status !== 'all') {
            query.status = status;
        }

        const conversations = await SMSConversation.find(query)
            .sort({ updatedAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format conversations for dashboard with privacy masking
        const formattedConversations = conversations.map(conv => ({
            conversationId: conv.conversationId,
            phoneNumber: maskPhoneNumber(conv.formattedPhoneNumber),
            trackingNumber: conv.trackingNumber, // Business number - don't mask
            messageCount: conv.messages.length,
            lastMessage: conv.latestMessage,
            triggeredByMissedCall: conv.triggeredByMissedCall,
            relatedCallId: conv.relatedCallId,
            extractedInfo: conv.extractedInfo,
            leadCreated: conv.leadCreated,
            status: conv.status,
            analytics: conv.analytics,
            startTime: conv.createdAt,
            lastActivity: conv.updatedAt,
            timeAgo: getTimeAgo(conv.updatedAt)
        }));

        res.status(200).json({
            success: true,
            conversations: formattedConversations,
            totalConversations: formattedConversations.length,
            businessId
        });

    } catch (error) {
        console.error('❌ Conversations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve conversations'
        });
    }
});

/**
 * @route POST /api/call-tracking/:businessId/conversations/:conversationId/reply
 * @desc Send manual SMS reply
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.post('/:businessId/conversations/:conversationId/reply', validateCSRFToken, authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId, conversationId } = req.params;
        const { message } = req.body;
        const userId = req.user.id;

        console.log(`💬 Sending manual reply for ${conversationId}`);

        // Validate message
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message content is required'
            });
        }

        if (message.length > 1600) {
            return res.status(400).json({
                success: false,
                error: 'Message too long (max 1600 characters)'
            });
        }

        // Send manual reply
        const result = await smsProcessingService.sendManualReply(
            conversationId,
            message.trim(),
            userId
        );

        res.status(200).json({
            success: true,
            result,
            businessId,
            conversationId
        });

    } catch (error) {
        console.error('❌ Manual reply error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send reply'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/phone-settings
 * @desc Get phone settings for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/phone-settings', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;

        console.log(`📞 Getting phone settings for ${businessId}`);

        const phoneSettings = await PhoneSettings.findOne({ businessId, status: 'active' });

        if (!phoneSettings) {
            return res.status(404).json({
                success: false,
                error: 'Phone settings not found for this business'
            });
        }

        // Format for dashboard (hide sensitive data)
        const settings = {
            businessId: phoneSettings.businessId,
            trackingNumber: phoneSettings.formattedTrackingNumber,
            forwardingNumber: phoneSettings.formattedForwardingNumber,
            businessDisplayNumber: phoneSettings.getBusinessDisplayNumber(),
            setupDescription: phoneSettings.getNumberSetupDescription(),
            isPortedNumber: phoneSettings.isPortedNumber(),
            setupType: phoneSettings.alternativeSetup.setupType,
            status: phoneSettings.status,
            smsEnabled: phoneSettings.smsEnabled,
            autoResponseEnabled: phoneSettings.autoResponseEnabled,
            businessHours: phoneSettings.businessHours,
            timeZone: phoneSettings.timeZone,
            responseSettings: phoneSettings.responseSettings,
            callSettings: phoneSettings.callSettings,
            analytics: phoneSettings.analytics,
            features: phoneSettings.features,
            lastCallReceived: phoneSettings.lastCallReceived,
            lastSMSSent: phoneSettings.lastSMSSent
        };

        res.status(200).json({
            success: true,
            phoneSettings: settings,
            businessId
        });

    } catch (error) {
        console.error('❌ Phone settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve phone settings'
        });
    }
});

/**
 * @route PUT /api/call-tracking/:businessId/phone-settings
 * @desc Update phone settings for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.put('/:businessId/phone-settings', validateCSRFToken, authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const updates = req.body;

        console.log(`📞 Updating phone settings for ${businessId}`);

        const phoneSettings = await PhoneSettings.findOne({ businessId, status: 'active' });

        if (!phoneSettings) {
            return res.status(404).json({
                success: false,
                error: 'Phone settings not found for this business'
            });
        }

        // Allowed fields for update
        const allowedFields = [
            'smsEnabled',
            'autoResponseEnabled',
            'missedCallTemplate',
            'businessHoursTemplate',
            'afterHoursTemplate',
            'appointmentConfirmationTemplate',
            'businessHours',
            'timeZone',
            'responseSettings',
            'callSettings',
            'features'
        ];

        // Apply updates
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                phoneSettings[field] = updates[field];
            }
        });

        await phoneSettings.save();

        res.status(200).json({
            success: true,
            message: 'Phone settings updated successfully',
            businessId
        });

    } catch (error) {
        console.error('❌ Phone settings update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update phone settings'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/health
 * @desc Get system health for business
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/health', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;

        console.log(`🔍 Getting system health for ${businessId}`);

        // Get health checks from all services
        const [callHealth, smsHealth, leadHealth] = await Promise.all([
            callHandlingService.healthCheck(),
            smsProcessingService.healthCheck(),
            leadIntegrationService.healthCheck()
        ]);

        const overallHealth = {
            businessId,
            timestamp: new Date().toISOString(),
            services: {
                callHandling: callHealth,
                smsProcessing: smsHealth,
                leadIntegration: leadHealth
            },
            overallStatus: 'healthy'
        };

        // Determine overall status
        const serviceStatuses = [callHealth.status, smsHealth.status, leadHealth.status];
        if (serviceStatuses.some(status => status === 'error')) {
            overallHealth.overallStatus = 'error';
        } else if (serviceStatuses.some(status => status === 'warning')) {
            overallHealth.overallStatus = 'warning';
        }

        const statusCode = overallHealth.overallStatus === 'healthy' ? 200 : 503;

        res.status(statusCode).json({
            success: true,
            health: overallHealth
        });

    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed'
        });
    }
});

/**
 * @route GET /api/call-tracking/:businessId/trends
 * @desc Get call trends for charts
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.get('/:businessId/trends', authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { timeframe = '7d' } = req.query;

        console.log(`📈 Getting call trends for ${businessId}, timeframe: ${timeframe}`);

        // Get call trends from service
        const trends = await callHandlingService.getCallTrends(businessId, timeframe);

        res.status(200).json({
            success: true,
            trends,
            timeframe,
            businessId
        });

    } catch (error) {
        console.error('❌ Call trends error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve call trends'
        });
    }
});

/**
 * @route POST /api/call-tracking/:businessId/send-sms
 * @desc Send manual SMS to a phone number
 * @access Private (Business Owner)
 * @security JWT + Business Owner Check
 */
router.post('/:businessId/send-sms', smsLimiter, validateCSRFToken, authenticateToken, checkBusinessOwner, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { phoneNumber, message } = req.body;
        const userId = req.user.id;

        console.log(`💬 Sending manual SMS from ${businessId} to ${phoneNumber}`);

        // Log SMS sending for security audit
        logSMSEvent(phoneNumber, businessId, { messageLength: message?.length }, req);

        // Validate input
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        // Validate phone number format (basic E.164 validation)
        const phoneRegex = /^\+?1?[0-9]{10,15}$/;
        if (!phoneRegex.test(phoneNumber.replace(/\s|-|\(|\)/g, ''))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }

        if (message.length > 1600) {
            return res.status(400).json({
                success: false,
                error: 'Message too long (max 1600 characters)'
            });
        }

        // Send SMS through service
        const result = await smsProcessingService.sendManualSMS(
            businessId,
            phoneNumber,
            message,
            userId
        );

        res.status(200).json({
            success: true,
            result,
            businessId,
            phoneNumber
        });

    } catch (error) {
        console.error('❌ Manual SMS error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send SMS'
        });
    }
});

// Utility function for time ago
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export default router; 