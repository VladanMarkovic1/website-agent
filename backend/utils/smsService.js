import twilioService from './twilioService.js';
import SMSConversation from '../models/SMSConversation.js';
import PhoneSettings from '../models/PhoneSettings.js';
import Business from '../models/Business.js';
import moment from 'moment-timezone';

class SMSService {
    constructor() {
        this.twilioService = twilioService;
    }

    // Generate conversation ID for SMS threads
    generateConversationId(businessId, phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return `${businessId}_${cleanNumber}_${Date.now()}`;
    }

    // Process SMS template with business data
    processTemplate(template, businessData, extraData = {}) {
        let processedTemplate = template;
        
        // Replace business placeholders
        if (businessData.businessName) {
            processedTemplate = processedTemplate.replace(/{businessName}/g, businessData.businessName);
        }
        
        // Replace extra data placeholders
        Object.keys(extraData).forEach(key => {
            const placeholder = new RegExp(`{${key}}`, 'g');
            processedTemplate = processedTemplate.replace(placeholder, extraData[key]);
        });
        
        return processedTemplate;
    }

    // Send missed call SMS
    async sendMissedCallSMS(businessId, callerNumber, callId = null) {
        try {
            // Get business phone settings
            const phoneSettings = await PhoneSettings.findOne({ businessId, status: 'active' });
            if (!phoneSettings) {
                throw new Error(`No active phone settings found for business: ${businessId}`);
            }

            // Get business information
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error(`Business not found: ${businessId}`);
            }

            // Check if SMS is enabled
            if (!phoneSettings.smsEnabled) {
                return { sent: false, reason: 'SMS disabled' };
            }

            // Check if we already have a recent conversation with this number
            const existingConversation = await SMSConversation.findOne({
                businessId,
                phoneNumber: callerNumber,
                status: { $ne: 'opted-out' },
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            });

            let conversation;
            if (existingConversation) {
                conversation = existingConversation;
            } else {
                // Create new conversation
                conversation = new SMSConversation({
                    businessId,
                    phoneNumber: callerNumber,
                    trackingNumber: phoneSettings.trackingNumber,
                    conversationId: this.generateConversationId(businessId, callerNumber),
                    triggeredByMissedCall: true,
                    relatedCallId: callId,
                    consentGiven: true // Implied consent from calling first
                });
                await conversation.save();
            }

            // Get appropriate SMS template
            const template = phoneSettings.getSMSTemplate('missed_call');
            const processedMessage = this.processTemplate(template, {
                businessName: business.businessName
            });

            // Send SMS with delay if configured
            const delayMinutes = phoneSettings.responseSettings.missedCallDelayMinutes || 2;
            
            if (delayMinutes > 0) {
                setTimeout(async () => {
                    await this.sendSMSMessage(conversation, processedMessage, true, callId);
                }, delayMinutes * 60 * 1000);
                
                return { 
                    sent: false, 
                    scheduled: true, 
                    delayMinutes,
                    conversationId: conversation.conversationId 
                };
            } else {
                // Send immediately
                return await this.sendSMSMessage(conversation, processedMessage, true, callId);
            }

        } catch (error) {
            throw error;
        }
    }

    // Send SMS message in a conversation
    async sendSMSMessage(conversation, message, isAutoResponse = false, relatedCallId = null) {
        try {
            // Get phone settings for from number
            const phoneSettings = await PhoneSettings.findOne({ 
                businessId: conversation.businessId,
                status: 'active' 
            });

            if (!phoneSettings) {
                throw new Error(`No phone settings found for business: ${conversation.businessId}`);
            }

            // Send SMS via Twilio
            const smsResult = await this.twilioService.sendSMS(
                conversation.phoneNumber,
                message,
                phoneSettings.trackingNumber
            );

            // Create message record
            const messageData = {
                direction: 'outbound',
                content: message,
                messageSid: smsResult.sid,
                status: smsResult.status || 'sent',
                isAutoResponse,
                responseToCallId: relatedCallId,
                timestamp: new Date()
            };

            // Add message to conversation
            await conversation.addMessage(messageData);

            // Update phone settings analytics
            await phoneSettings.incrementAnalytic('smssSent');

            return {
                sent: true,
                messageSid: smsResult.sid,
                conversationId: conversation.conversationId,
                message: message,
                mock: smsResult.mock || false
            };

        } catch (error) {
            
            // Log error in conversation if possible
            if (conversation) {
                const errorMessage = {
                    direction: 'outbound',
                    content: message,
                    messageSid: 'error_' + Date.now(),
                    status: 'failed',
                    errorMessage: error.message,
                    isAutoResponse,
                    timestamp: new Date()
                };
                await conversation.addMessage(errorMessage);
            }
            
            throw error;
        }
    }

    // Process incoming SMS
    async processIncomingSMS(from, to, body, messageSid) {
        try {
            // Find phone settings by any number (supports porting)
            const phoneSettings = await PhoneSettings.findByAnyNumber(to);
            if (!phoneSettings) {
                return { processed: false, reason: 'No phone settings found' };
            }

            // Check for opt-out keywords
            const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'END', 'CANCEL'];
            if (optOutKeywords.some(keyword => body.toUpperCase().includes(keyword))) {
                return await this.handleOptOut(from, phoneSettings.businessId, messageSid);
            }

            // Find or create conversation
            let conversation = await SMSConversation.findOne({
                businessId: phoneSettings.businessId,
                phoneNumber: from,
                status: { $ne: 'opted-out' }
            }).sort({ createdAt: -1 });

            if (!conversation) {
                // Create new conversation for incoming SMS
                conversation = new SMSConversation({
                    businessId: phoneSettings.businessId,
                    phoneNumber: from,
                    trackingNumber: to,
                    conversationId: this.generateConversationId(phoneSettings.businessId, from),
                    triggeredByMissedCall: false,
                    consentGiven: true // Implied consent by initiating SMS
                });
                await conversation.save();
            }

            // Add incoming message
            const messageData = {
                direction: 'inbound',
                content: body,
                messageSid: messageSid,
                status: 'received',
                timestamp: new Date()
            };

            await conversation.addMessage(messageData);

            // Update analytics
            await phoneSettings.incrementAnalytic('smsResponses');

            // Extract information from message
            await this.extractInformationFromMessage(conversation, body);

            // Send auto-response if enabled and appropriate
            if (phoneSettings.autoResponseEnabled && conversation.messages.length === 1) {
                await this.sendAutoResponse(conversation, phoneSettings);
            }

            return {
                processed: true,
                conversationId: conversation.conversationId,
                businessId: phoneSettings.businessId,
                newConversation: conversation.messages.length === 1
            };

        } catch (error) {
            return { processed: false, error: error.message };
        }
    }

    // Handle SMS opt-out
    async handleOptOut(phoneNumber, businessId, messageSid) {
        try {
            // Find all conversations for this number and business
            const conversations = await SMSConversation.find({
                businessId,
                phoneNumber,
                status: { $ne: 'opted-out' }
            });

            // Mark all conversations as opted out
            for (const conversation of conversations) {
                await conversation.optOut();
                
                // Add opt-out message
                const messageData = {
                    direction: 'inbound',
                    content: 'STOP',
                    messageSid: messageSid,
                    status: 'received',
                    timestamp: new Date()
                };
                await conversation.addMessage(messageData);
            }

            // Send confirmation SMS
            const confirmationMessage = "You have been unsubscribed from SMS messages. Reply START to opt back in.";
            await this.twilioService.sendSMS(phoneNumber, confirmationMessage);

            return {
                processed: true,
                optedOut: true,
                conversationsAffected: conversations.length
            };

        } catch (error) {
            throw error;
        }
    }

    // Send auto-response
    async sendAutoResponse(conversation, phoneSettings) {
        try {
            const delaySeconds = phoneSettings.responseSettings.autoResponseDelaySeconds || 30;
            
            setTimeout(async () => {
                const business = await Business.findOne({ businessId: conversation.businessId });
                const template = phoneSettings.getSMSTemplate('auto_response');
                const message = this.processTemplate(template, {
                    businessName: business?.businessName || 'Our Practice'
                });

                await this.sendSMSMessage(conversation, message, true);
            }, delaySeconds * 1000);

        } catch (error) {
        }
    }

    // Extract information from SMS content
    async extractInformationFromMessage(conversation, messageContent) {
        try {
            const lowerContent = messageContent.toLowerCase();
            
            // Simple keyword extraction (can be enhanced with AI/NLP later)
            const keywords = {
                appointment: ['appointment', 'schedule', 'book', 'available', 'time'],
                emergency: ['emergency', 'urgent', 'pain', 'hurts', 'broken', 'bleeding'],
                cleaning: ['cleaning', 'checkup', 'check up', 'routine'],
                cosmetic: ['whitening', 'veneers', 'cosmetic', 'smile'],
                orthodontics: ['braces', 'invisalign', 'straight', 'crooked']
            };

            const extractedInfo = {};

            // Check for service interest
            Object.keys(keywords).forEach(service => {
                if (keywords[service].some(keyword => lowerContent.includes(keyword))) {
                    extractedInfo.serviceInterest = service;
                }
            });

            // Check for urgency
            if (keywords.emergency.some(keyword => lowerContent.includes(keyword))) {
                extractedInfo.urgency = 'emergency';
            }

            // Check for appointment request
            if (keywords.appointment.some(keyword => lowerContent.includes(keyword))) {
                extractedInfo.appointmentRequested = true;
            }

            // Update conversation with extracted info
            if (Object.keys(extractedInfo).length > 0) {
                Object.assign(conversation.extractedInfo, extractedInfo);
                await conversation.save();
            }

        } catch (error) {
        }
    }

    // Get conversation analytics
    async getConversationAnalytics(businessId, timeframe = '7d') {
        try {
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            const conversations = await SMSConversation.find({
                businessId,
                createdAt: { $gte: startDate }
            });

            const analytics = {
                totalConversations: conversations.length,
                missedCallTriggered: conversations.filter(c => c.triggeredByMissedCall).length,
                averageResponseTime: 0,
                conversionRate: 0,
                optOutRate: 0,
                serviceInterests: {}
            };

            // Calculate service interests
            conversations.forEach(conv => {
                if (conv.extractedInfo.serviceInterest) {
                    analytics.serviceInterests[conv.extractedInfo.serviceInterest] = 
                        (analytics.serviceInterests[conv.extractedInfo.serviceInterest] || 0) + 1;
                }
            });

            return analytics;

        } catch (error) {
            throw error;
        }
    }
}

// Export singleton instance
const smsService = new SMSService();
export default smsService; 