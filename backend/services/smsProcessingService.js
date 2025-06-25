import smsService from '../utils/smsService.js';
import twilioService from '../utils/twilioService.js';
import SMSConversation from '../models/SMSConversation.js';
import PhoneSettings from '../models/PhoneSettings.js';
import Business from '../models/Business.js';
import CallLog from '../models/CallLog.js';
import moment from 'moment-timezone';

class SMSProcessingService {
    constructor() {
        this.smsService = smsService;
        this.twilioService = twilioService;
        this.followUpQueue = [];
        this.processingFollowUps = false;
    }

    // Process incoming SMS webhook from Twilio
    async processIncomingSMS(smsData) {
        try {
            // Basic validation
            if (!smsData.MessageSid || !smsData.From || !smsData.To || !smsData.Body) {
                return { success: false, error: 'Invalid SMS data' };
            }

            // Process the SMS through our SMS service
            const processResult = await this.smsService.processIncomingSMS(smsData.From, smsData.To, smsData.Body, smsData.MessageSid);
            
            if (!processResult.processed) {
                return { success: false, error: processResult.reason || 'Processing failed' };
            }

            // Additional processing for business logic
            await this.handleConversationFlow(processResult.conversationId, processResult.businessId);

            // Schedule follow-up if needed
            await this.scheduleFollowUpIfNeeded(processResult.conversationId);

            return {
                success: true,
                conversationId: processResult.conversationId,
                businessId: processResult.businessId,
                newConversation: processResult.newConversation
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Handle conversation flow logic
    async handleConversationFlow(conversationId, businessId) {
        try {
            const conversation = await SMSConversation.findOne({ conversationId });
            if (!conversation) {
                return;
            }

            const latestMessage = conversation.latestMessage;
            if (!latestMessage || latestMessage.direction !== 'inbound') {
                return; // No new inbound message to process
            }

            // Check if this is an appointment request
            if (conversation.extractedInfo.appointmentRequested && !conversation.extractedInfo.appointmentHandled) {
                await this.handleAppointmentRequest(conversation);
            }

            // Check if this is an emergency
            if (conversation.extractedInfo.urgency === 'emergency') {
                await this.handleEmergencyRequest(conversation);
            }

            // Check if lead should be created
            if (this.shouldCreateLead(conversation)) {
                await this.triggerLeadCreation(conversation);
            }

            // Update conversation analytics
            await this.updateConversationAnalytics(conversation);

        } catch (error) {
        }
    }

    // Handle appointment requests
    async handleAppointmentRequest(conversation) {
        try {
            const phoneSettings = await PhoneSettings.findOne({ 
                businessId: conversation.businessId,
                status: 'active' 
            });

            if (!phoneSettings) {
                return;
            }

            // Send appointment confirmation template
            const template = phoneSettings.appointmentConfirmationTemplate;
            const business = await Business.findOne({ businessId: conversation.businessId });
            
            const message = this.smsService.processTemplate(template, {
                businessName: business?.businessName || 'Our Practice'
            });

            await this.smsService.sendSMSMessage(conversation, message, true);

            // Mark as handled
            conversation.extractedInfo.appointmentHandled = true;
            await conversation.save();

        } catch (error) {
        }
    }

    // Handle emergency requests
    async handleEmergencyRequest(conversation) {
        try {
            // Send priority response
            const emergencyMessage = "We understand this is urgent. Our staff will call you back within the next 30 minutes. If this is a life-threatening emergency, please call 911.";
            
            await this.smsService.sendSMSMessage(conversation, emergencyMessage, true);

            // Mark conversation as high priority
            conversation.extractedInfo.urgency = 'emergency';
            conversation.extractedInfo.priorityFollowUp = true;
            await conversation.save();

            // Emit high-priority notification
            this.emitEmergencyNotification(conversation);

        } catch (error) {
        }
    }

    // Determine if a lead should be created
    shouldCreateLead(conversation) {
        // Don't create duplicate leads
        if (conversation.leadCreated) {
            return false;
        }

        // Create lead if:
        // 1. Appointment requested
        // 2. Service interest identified
        // 3. Multiple messages exchanged
        // 4. Emergency request
        
        const conditions = [
            conversation.extractedInfo.appointmentRequested,
            conversation.extractedInfo.serviceInterest,
            conversation.messages.length >= 2,
            conversation.extractedInfo.urgency === 'emergency'
        ];

        return conditions.some(condition => condition);
    }

    // Trigger lead creation
    async triggerLeadCreation(conversation) {
        try {
            // This would integrate with your existing lead creation system
            const leadData = {
                businessId: conversation.businessId,
                phone: conversation.phoneNumber,
                source: 'SMS',
                service: conversation.extractedInfo.serviceInterest || 'General Inquiry',
                reason: this.generateLeadReason(conversation),
                urgency: conversation.extractedInfo.urgency || 'medium',
                extractedInfo: conversation.extractedInfo,
                conversationId: conversation.conversationId
            };

            // Here you would call your existing lead creation service
            // const lead = await leadService.createLead(leadData);
            
            // For now, just mark as lead created
            conversation.leadCreated = true;
            conversation.analytics.converted = true;
            await conversation.save();

            // Update related call log if exists
            if (conversation.relatedCallId) {
                await CallLog.findByIdAndUpdate(conversation.relatedCallId, {
                    leadCreated: true
                });
            }

        } catch (error) {
        }
    }

    // Generate lead reason from conversation
    generateLeadReason(conversation) {
        const { serviceInterest, urgency, appointmentRequested } = conversation.extractedInfo;
        
        let reason = 'SMS inquiry';
        
        if (urgency === 'emergency') {
            reason = 'Emergency dental consultation needed';
        } else if (appointmentRequested) {
            reason = `Appointment request for ${serviceInterest || 'general care'}`;
        } else if (serviceInterest) {
            reason = `Interest in ${serviceInterest} services`;
        }

        return reason;
    }

    // Update conversation analytics
    async updateConversationAnalytics(conversation) {
        try {
            const now = new Date();
            const conversationStart = conversation.createdAt;
            
            // Update duration
            conversation.analytics.conversationDuration = Math.round(
                (now - conversationStart) / (1000 * 60)
            ); // in minutes

            // Calculate response time (if this is first response)
            const firstOutbound = conversation.messages.find(msg => msg.direction === 'outbound');
            const firstInbound = conversation.messages.find(msg => msg.direction === 'inbound');
            
            if (firstOutbound && firstInbound && conversation.analytics.averageResponseTime === 0) {
                const responseTime = Math.round(
                    (firstOutbound.timestamp - firstInbound.timestamp) / (1000 * 60)
                ); // in minutes
                conversation.analytics.averageResponseTime = responseTime;
            }

            await conversation.save();

        } catch (error) {
        }
    }

    // Schedule follow-up messages
    async scheduleFollowUpIfNeeded(conversationId) {
        try {
            const conversation = await SMSConversation.findOne({ conversationId });
            if (!conversation) return;

            const phoneSettings = await PhoneSettings.findOne({ 
                businessId: conversation.businessId,
                status: 'active' 
            });

            if (!phoneSettings || !phoneSettings.responseSettings.followUpEnabled) {
                return; // Follow-up disabled
            }

            // Check if follow-up needed
            if (this.needsFollowUp(conversation)) {
                const followUpDelay = phoneSettings.responseSettings.followUpDelayHours * 60 * 60 * 1000;
                
                setTimeout(() => {
                    this.sendFollowUpMessage(conversationId);
                }, followUpDelay);

            }

        } catch (error) {
        }
    }

    // Check if conversation needs follow-up
    needsFollowUp(conversation) {
        // Don't follow up if:
        // - Already converted to lead
        // - Opted out
        // - Emergency (handled differently)
        // - Recent activity (within 2 hours)
        
        if (conversation.leadCreated || 
            conversation.status === 'opted-out' ||
            conversation.extractedInfo.urgency === 'emergency') {
            return false;
        }

        const lastMessage = conversation.latestMessage;
        if (!lastMessage) return false;

        // Follow up if last message was from customer and no recent activity
        const isFromCustomer = lastMessage.direction === 'inbound';
        const isOld = moment().diff(moment(lastMessage.timestamp), 'hours') >= 2;
        
        return isFromCustomer && isOld;
    }

    // Send follow-up message
    async sendFollowUpMessage(conversationId) {
        try {
            const conversation = await SMSConversation.findOne({ conversationId });
            if (!conversation || conversation.status !== 'active') {
                return;
            }

            const followUpMessage = "Hi! We wanted to follow up on your inquiry. Is there anything else we can help you with? Our team is here to assist you.";
            
            await this.smsService.sendSMSMessage(conversation, followUpMessage, true);
            
        } catch (error) {
        }
    }

    // Send manual SMS reply from dashboard
    async sendManualReply(conversationId, message, userId = null) {
        try {
            const conversation = await SMSConversation.findOne({ conversationId });
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            if (conversation.status === 'opted-out') {
                throw new Error('User has opted out of SMS');
            }

            const result = await this.smsService.sendSMSMessage(conversation, message, false);
            
            // Log who sent the message
            if (userId) {
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                lastMessage.sentBy = userId;
                await conversation.save();
            }

            return {
                success: true,
                messageSid: result.messageSid,
                conversationId: conversation.conversationId
            };

        } catch (error) {
            throw error;
        }
    }

    // Send manual SMS to any phone number
    async sendManualSMS(businessId, phoneNumber, message, userId = null) {
        try {
            // Get phone settings for the business
            const phoneSettings = await PhoneSettings.findOne({
                businessId,
                status: 'active'
            });

            if (!phoneSettings) {
                throw new Error('Phone settings not found for business');
            }

            // Check if conversation already exists
            let conversation = await SMSConversation.findOne({
                businessId,
                phoneNumber: phoneNumber
            });

            if (!conversation) {
                // Create new conversation
                const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                conversation = new SMSConversation({
                    businessId,
                    conversationId,
                    phoneNumber,
                    formattedPhoneNumber: this.formatPhoneNumber(phoneNumber),
                    trackingNumber: phoneSettings.trackingNumber,
                    messages: [],
                    triggeredByMissedCall: false,
                    extractedInfo: {
                        hasAppointmentRequest: false,
                        serviceInterest: 'Manual SMS',
                        urgencyLevel: 'low'
                    },
                    status: 'active',
                    analytics: {
                        responseTime: null,
                        messageCount: 0,
                        lastActivity: new Date()
                    }
                });
            }

            // Send SMS using the SMS service
            const result = await this.smsService.sendSMSMessage(conversation, message, false);
            
            // Log who sent the message
            if (userId && conversation.messages.length > 0) {
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                lastMessage.sentBy = userId;
                lastMessage.isManual = true;
            }

            await conversation.save();

            return {
                success: true,
                messageSid: result.messageSid,
                conversationId: conversation.conversationId,
                phoneNumber: phoneNumber
            };

        } catch (error) {
            throw error;
        }
    }

    // Helper method to format phone number
    formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Handle US phone numbers
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            const number = cleaned.substring(1);
            return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
        }
        
        return phoneNumber; // Return original if can't format
    }

    // Get conversation summary for dashboard
    async getConversationSummary(businessId, timeframe = '7d') {
        try {
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            const conversations = await SMSConversation.find({
                businessId,
                createdAt: { $gte: startDate }
            });

            const summary = {
                total: conversations.length,
                active: conversations.filter(c => c.status === 'active').length,
                converted: conversations.filter(c => c.leadCreated).length,
                fromMissedCalls: conversations.filter(c => c.triggeredByMissedCall).length,
                averageResponseTime: 0,
                serviceInterests: {},
                emergencyRequests: conversations.filter(c => c.extractedInfo.urgency === 'emergency').length
            };

            // Calculate average response time
            const responseTimes = conversations
                .map(c => c.analytics.averageResponseTime)
                .filter(time => time > 0);
            
            if (responseTimes.length > 0) {
                summary.averageResponseTime = Math.round(
                    responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                );
            }

            // Count service interests
            conversations.forEach(conv => {
                const interest = conv.extractedInfo.serviceInterest;
                if (interest) {
                    summary.serviceInterests[interest] = (summary.serviceInterests[interest] || 0) + 1;
                }
            });

            return summary;

        } catch (error) {
            throw error;
        }
    }

    // Emit emergency notification
    emitEmergencyNotification(conversation) {
        // TODO: Integrate with WebSocket and email notifications
        // io.emit('emergencyRequest', {
        //     businessId: conversation.businessId,
        //     phoneNumber: conversation.formattedPhoneNumber,
        //     urgency: conversation.extractedInfo.urgency,
        //     serviceInterest: conversation.extractedInfo.serviceInterest,
        //     timestamp: new Date()
        // });
    }

    // Health check for SMS processing
    async healthCheck() {
        try {
            const checks = {
                smsService: { status: 'healthy', message: 'SMS service operational' },
                conversationCount: await this.getActiveConversationCount(),
                followUpQueue: { status: 'healthy', message: `${this.followUpQueue.length} pending follow-ups` }
            };

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                checks: checks
            };

        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get active conversation count
    async getActiveConversationCount() {
        try {
            const count = await SMSConversation.countDocuments({ status: 'active' });
            return { status: 'healthy', message: `${count} active conversations` };
        } catch (error) {
            return { status: 'error', message: 'Failed to count conversations' };
        }
    }
}

// Export singleton instance
const smsProcessingService = new SMSProcessingService();
export default smsProcessingService; 