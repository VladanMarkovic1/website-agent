import CallLog from '../models/CallLog.js';
import SMSConversation from '../models/SMSConversation.js';
import PhoneSettings from '../models/PhoneSettings.js';
import Business from '../models/Business.js';
import Lead from '../models/Lead.js'; // Your existing Lead model
import moment from 'moment-timezone';

class LeadIntegrationService {
    constructor() {
        this.leadScoreWeights = {
            emergencyRequest: 50,
            appointmentRequested: 40,
            serviceInterestIdentified: 30,
            multipleMessages: 20,
            quickResponse: 15,
            missedCallFollowUp: 25
        };
    }

    // Create lead from call tracking data
    async createLeadFromCall(callLogId) {
        try {
            console.log('👤 Creating lead from call log:', callLogId);

            const callLog = await CallLog.findById(callLogId);
            if (!callLog) {
                throw new Error('Call log not found');
            }

            // Don't create duplicate leads
            if (callLog.leadCreated) {
                console.log('✅ Lead already exists for this call');
                return { alreadyExists: true, callLogId };
            }

            const business = await Business.findOne({ businessId: callLog.businessId });
            if (!business) {
                throw new Error('Business not found');
            }

            // Prepare lead data
            const leadData = {
                businessId: callLog.businessId,
                phone: callLog.formattedCallerNumber,
                source: 'Call Tracking',
                service: 'Phone Inquiry',
                reason: this.generateCallLeadReason(callLog),
                urgency: callLog.isMissedCall ? 'high' : 'medium',
                callTrackingData: {
                    callLogId: callLog._id,
                    trackingNumber: callLog.trackingNumber,
                    callDuration: callLog.callDuration,
                    isMissedCall: callLog.isMissedCall,
                    callTime: callLog.callStartTime
                },
                leadScore: this.calculateCallLeadScore(callLog),
                status: 'new'
            };

            // Create the lead using your existing Lead model
            const lead = new Lead(leadData);
            await lead.save();

            // Update call log
            callLog.leadCreated = true;
            callLog.leadId = lead._id;
            await callLog.save();

            console.log(`✅ Lead created from call: ${lead._id}`);

            return {
                success: true,
                leadId: lead._id,
                callLogId: callLog._id,
                leadScore: leadData.leadScore
            };

        } catch (error) {
            console.error('❌ Error creating lead from call:', error);
            throw error;
        }
    }

    // Create lead from SMS conversation
    async createLeadFromSMS(conversationId) {
        try {
            console.log('👤 Creating lead from SMS conversation:', conversationId);

            const conversation = await SMSConversation.findOne({ conversationId });
            if (!conversation) {
                throw new Error('SMS conversation not found');
            }

            // Don't create duplicate leads
            if (conversation.leadCreated) {
                console.log('✅ Lead already exists for this conversation');
                return { alreadyExists: true, conversationId };
            }

            const business = await Business.findOne({ businessId: conversation.businessId });
            if (!business) {
                throw new Error('Business not found');
            }

            // Prepare lead data
            const leadData = {
                businessId: conversation.businessId,
                phone: conversation.formattedPhoneNumber,
                source: 'SMS',
                service: conversation.extractedInfo.serviceInterest || 'SMS Inquiry',
                reason: this.generateSMSLeadReason(conversation),
                urgency: this.determineSMSUrgency(conversation),
                smsTrackingData: {
                    conversationId: conversation.conversationId,
                    messageCount: conversation.messages.length,
                    triggeredByMissedCall: conversation.triggeredByMissedCall,
                    extractedInfo: conversation.extractedInfo,
                    conversationStartTime: conversation.createdAt
                },
                leadScore: this.calculateSMSLeadScore(conversation),
                status: 'new'
            };

            // Create the lead
            const lead = new Lead(leadData);
            await lead.save();

            // Update conversation
            conversation.leadCreated = true;
            conversation.leadId = lead._id;
            conversation.analytics.converted = true;
            await conversation.save();

            // Update related call log if exists
            if (conversation.relatedCallId) {
                await CallLog.findByIdAndUpdate(conversation.relatedCallId, {
                    leadCreated: true,
                    leadId: lead._id
                });
            }

            console.log(`✅ Lead created from SMS: ${lead._id}`);

            return {
                success: true,
                leadId: lead._id,
                conversationId: conversation.conversationId,
                leadScore: leadData.leadScore
            };

        } catch (error) {
            console.error('❌ Error creating lead from SMS:', error);
            throw error;
        }
    }

    // Generate lead reason for calls
    generateCallLeadReason(callLog) {
        if (callLog.isMissedCall) {
            return `Missed call - ${callLog.callDuration > 0 ? 'Brief contact' : 'No answer'}`;
        }
        
        if (callLog.callDuration > 300) { // 5+ minutes
            return 'Extended phone consultation';
        } else if (callLog.callDuration > 60) { // 1+ minute
            return 'Phone inquiry';
        } else {
            return 'Brief phone contact';
        }
    }

    // Generate lead reason for SMS
    generateSMSLeadReason(conversation) {
        const { serviceInterest, urgency, appointmentRequested } = conversation.extractedInfo;
        
        if (urgency === 'emergency') {
            return `Emergency: ${serviceInterest || 'Urgent dental care needed'}`;
        }
        
        if (appointmentRequested) {
            return `Appointment request: ${serviceInterest || 'General care'}`;
        }
        
        if (serviceInterest) {
            return `Service inquiry: ${serviceInterest}`;
        }
        
        return conversation.triggeredByMissedCall ? 
            'Missed call follow-up via SMS' : 
            'SMS inquiry';
    }

    // Determine SMS urgency level
    determineSMSUrgency(conversation) {
        if (conversation.extractedInfo.urgency === 'emergency') {
            return 'urgent';
        }
        
        if (conversation.extractedInfo.appointmentRequested) {
            return 'high';
        }
        
        if (conversation.triggeredByMissedCall) {
            return 'high';
        }
        
        return 'medium';
    }

    // Calculate lead score for calls
    calculateCallLeadScore(callLog) {
        let score = 0;
        
        // Base score for any call
        score += 10;
        
        // Missed call penalty but potential for follow-up
        if (callLog.isMissedCall) {
            score += this.leadScoreWeights.missedCallFollowUp;
        }
        
        // Call duration scoring
        if (callLog.callDuration > 300) { // 5+ minutes
            score += 30;
        } else if (callLog.callDuration > 120) { // 2+ minutes
            score += 20;
        } else if (callLog.callDuration > 30) { // 30+ seconds
            score += 10;
        }
        
        // SMS follow-up bonus
        if (callLog.smsTriggered) {
            score += 15;
        }
        
        return Math.min(score, 100); // Cap at 100
    }

    // Calculate lead score for SMS
    calculateSMSLeadScore(conversation) {
        let score = 0;
        
        // Base score for SMS engagement
        score += 15;
        
        // Emergency requests
        if (conversation.extractedInfo.urgency === 'emergency') {
            score += this.leadScoreWeights.emergencyRequest;
        }
        
        // Appointment requests
        if (conversation.extractedInfo.appointmentRequested) {
            score += this.leadScoreWeights.appointmentRequested;
        }
        
        // Service interest identified
        if (conversation.extractedInfo.serviceInterest) {
            score += this.leadScoreWeights.serviceInterestIdentified;
        }
        
        // Multiple messages (engagement)
        if (conversation.messages.length >= 3) {
            score += this.leadScoreWeights.multipleMessages;
        }
        
        // Quick response bonus
        if (conversation.analytics.averageResponseTime < 15) { // < 15 minutes
            score += this.leadScoreWeights.quickResponse;
        }
        
        // Missed call follow-up
        if (conversation.triggeredByMissedCall) {
            score += this.leadScoreWeights.missedCallFollowUp;
        }
        
        return Math.min(score, 100); // Cap at 100
    }

    // Enhanced lead with tracking context
    async enhanceExistingLead(leadId) {
        try {
            const lead = await Lead.findById(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Find related call logs
            const callLogs = await CallLog.find({
                $or: [
                    { callerNumber: lead.phone },
                    { leadId: leadId }
                ],
                businessId: lead.businessId
            }).sort({ createdAt: -1 });

            // Find related SMS conversations
            const smsConversations = await SMSConversation.find({
                $or: [
                    { phoneNumber: lead.phone },
                    { leadId: leadId }
                ],
                businessId: lead.businessId
            }).sort({ createdAt: -1 });

            // Enhance lead with tracking data
            const enhancement = {
                callTrackingHistory: callLogs.map(call => ({
                    callId: call._id,
                    callTime: call.callStartTime,
                    duration: call.callDuration,
                    isMissedCall: call.isMissedCall,
                    trackingNumber: call.trackingNumber
                })),
                smsConversationHistory: smsConversations.map(conv => ({
                    conversationId: conv.conversationId,
                    startTime: conv.createdAt,
                    messageCount: conv.messages.length,
                    converted: conv.leadCreated,
                    extractedInfo: conv.extractedInfo
                })),
                totalTouchpoints: callLogs.length + smsConversations.length,
                lastContact: this.getLastContactTime(callLogs, smsConversations),
                engagementScore: this.calculateEngagementScore(callLogs, smsConversations)
            };

            // Update lead with enhancement data
            lead.trackingEnhancement = enhancement;
            lead.leadScore = Math.max(lead.leadScore || 0, enhancement.engagementScore);
            await lead.save();

            return {
                success: true,
                leadId: lead._id,
                enhancement: enhancement
            };

        } catch (error) {
            console.error('❌ Error enhancing lead:', error);
            throw error;
        }
    }

    // Get last contact time from all touchpoints
    getLastContactTime(callLogs, smsConversations) {
        const times = [];
        
        callLogs.forEach(call => times.push(call.callStartTime));
        smsConversations.forEach(conv => {
            if (conv.latestMessage) {
                times.push(conv.latestMessage.timestamp);
            }
        });
        
        return times.length > 0 ? new Date(Math.max(...times.map(t => t.getTime()))) : null;
    }

    // Calculate overall engagement score
    calculateEngagementScore(callLogs, smsConversations) {
        let score = 0;
        
        // Call engagement
        callLogs.forEach(call => {
            score += call.isMissedCall ? 15 : 25;
            if (call.callDuration > 120) score += 10;
        });
        
        // SMS engagement
        smsConversations.forEach(conv => {
            score += conv.messages.length * 3;
            if (conv.extractedInfo.appointmentRequested) score += 20;
            if (conv.extractedInfo.urgency === 'emergency') score += 30;
        });
        
        return Math.min(score, 100);
    }

    // Bulk process leads from tracking data
    async bulkProcessLeads(businessId, timeframe = '24h') {
        try {
            console.log(`🔄 Bulk processing leads for business: ${businessId}`);
            
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            // Find unprocessed call logs
            const unprocessedCalls = await CallLog.find({
                businessId,
                createdAt: { $gte: startDate },
                leadCreated: false,
                isMissedCall: true // Focus on missed calls for lead generation
            });

            // Find unprocessed SMS conversations
            const unprocessedSMS = await SMSConversation.find({
                businessId,
                createdAt: { $gte: startDate },
                leadCreated: false,
                status: 'active'
            });

            const results = {
                callLeadsCreated: 0,
                smsLeadsCreated: 0,
                errorLogs: []
            };

            // Process calls
            for (const callLog of unprocessedCalls) {
                try {
                    const result = await this.createLeadFromCall(callLog._id);
                    if (result.success) {
                        results.callLeadsCreated++;
                    }
                } catch (error) {
                    results.errorLogs.push({
                        type: 'call',
                        id: callLog._id,
                        error: error.message
                    });
                }
            }

            // Process SMS conversations
            for (const conversation of unprocessedSMS) {
                // Only create leads for qualifying conversations
                if (this.qualifiesForLead(conversation)) {
                    try {
                        const result = await this.createLeadFromSMS(conversation.conversationId);
                        if (result.success) {
                            results.smsLeadsCreated++;
                        }
                    } catch (error) {
                        results.errorLogs.push({
                            type: 'sms',
                            id: conversation.conversationId,
                            error: error.message
                        });
                    }
                }
            }

            console.log(`✅ Bulk processing complete: ${results.callLeadsCreated} call leads, ${results.smsLeadsCreated} SMS leads`);

            return results;

        } catch (error) {
            console.error('❌ Error in bulk lead processing:', error);
            throw error;
        }
    }

    // Check if SMS conversation qualifies for lead
    qualifiesForLead(conversation) {
        return (
            conversation.extractedInfo.appointmentRequested ||
            conversation.extractedInfo.serviceInterest ||
            conversation.extractedInfo.urgency === 'emergency' ||
            conversation.messages.length >= 2
        );
    }

    // Get lead analytics with tracking context
    async getLeadAnalytics(businessId, timeframe = '30d') {
        try {
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            const leads = await Lead.find({
                businessId,
                createdAt: { $gte: startDate }
            });

            const analytics = {
                totalLeads: leads.length,
                sourceBreakdown: {
                    'Call Tracking': 0,
                    'SMS': 0,
                    'Other': 0
                },
                urgencyBreakdown: {
                    urgent: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                averageLeadScore: 0,
                conversionMetrics: {
                    missedCallsToLeads: 0,
                    smsConversationsToLeads: 0,
                    totalTouchpointsGenerated: 0
                }
            };

            // Process each lead
            leads.forEach(lead => {
                // Source breakdown
                analytics.sourceBreakdown[lead.source] = 
                    (analytics.sourceBreakdown[lead.source] || 0) + 1;
                
                // Urgency breakdown
                analytics.urgencyBreakdown[lead.urgency] = 
                    (analytics.urgencyBreakdown[lead.urgency] || 0) + 1;
            });

            // Calculate averages
            const leadScores = leads.map(l => l.leadScore || 0).filter(s => s > 0);
            if (leadScores.length > 0) {
                analytics.averageLeadScore = Math.round(
                    leadScores.reduce((sum, score) => sum + score, 0) / leadScores.length
                );
            }

            // Get conversion metrics
            const callLogs = await CallLog.find({
                businessId,
                createdAt: { $gte: startDate },
                isMissedCall: true
            });

            const smsConversations = await SMSConversation.find({
                businessId,
                createdAt: { $gte: startDate }
            });

            analytics.conversionMetrics.missedCallsToLeads = 
                Math.round((analytics.sourceBreakdown['Call Tracking'] / callLogs.length) * 100) || 0;
            
            analytics.conversionMetrics.smsConversationsToLeads = 
                Math.round((analytics.sourceBreakdown['SMS'] / smsConversations.length) * 100) || 0;
            
            analytics.conversionMetrics.totalTouchpointsGenerated = 
                callLogs.length + smsConversations.length;

            return analytics;

        } catch (error) {
            console.error('❌ Error generating lead analytics:', error);
            throw error;
        }
    }

    // Health check for lead integration
    async healthCheck() {
        try {
            const checks = {
                leadModel: await this.checkLeadModel(),
                callLogIntegration: await this.checkCallLogIntegration(),
                smsIntegration: await this.checkSMSIntegration()
            };

            const allHealthy = Object.values(checks).every(check => 
                check.status === 'healthy'
            );

            return {
                status: allHealthy ? 'healthy' : 'warning',
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

    // Check lead model integration
    async checkLeadModel() {
        try {
            await Lead.findOne().limit(1);
            return { status: 'healthy', message: 'Lead model accessible' };
        } catch (error) {
            return { status: 'error', message: 'Lead model integration failed' };
        }
    }

    // Check call log integration
    async checkCallLogIntegration() {
        try {
            const count = await CallLog.countDocuments({ leadCreated: true });
            return { status: 'healthy', message: `${count} calls linked to leads` };
        } catch (error) {
            return { status: 'error', message: 'Call log integration failed' };
        }
    }

    // Check SMS integration
    async checkSMSIntegration() {
        try {
            const count = await SMSConversation.countDocuments({ leadCreated: true });
            return { status: 'healthy', message: `${count} SMS conversations linked to leads` };
        } catch (error) {
            return { status: 'error', message: 'SMS integration failed' };
        }
    }
}

// Export singleton instance
const leadIntegrationService = new LeadIntegrationService();
export default leadIntegrationService; 