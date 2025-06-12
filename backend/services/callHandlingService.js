import twilioService from '../utils/twilioService.js';
import smsService from '../utils/smsService.js';
import CallLog from '../models/CallLog.js';
import PhoneSettings from '../models/PhoneSettings.js';
import Business from '../models/Business.js';
import moment from 'moment-timezone';

class CallHandlingService {
    constructor() {
        this.twilioService = twilioService;
        this.smsService = smsService;
    }

    // Handle incoming call webhook from Twilio
    async handleIncomingCall(callData) {
        try {
            console.log('📞 Processing incoming call:', callData);
            
            const { CallSid, From, To, CallStatus, Direction } = callData;
            
            // Find phone settings for the incoming number (supports porting)
            const phoneSettings = await PhoneSettings.findByAnyNumber(To);
            if (!phoneSettings) {
                console.error(`❌ No phone settings found for number: ${To}`);
                return this.generateErrorResponse('Phone number not configured');
            }

            // Get business information
            const business = await Business.findOne({ businessId: phoneSettings.businessId });
            if (!business) {
                console.error(`❌ Business not found: ${phoneSettings.businessId}`);
                return this.generateErrorResponse('Business not found');
            }

            // Create call log entry (enhanced for porting)
            const callLog = new CallLog({
                businessId: phoneSettings.businessId,
                trackingNumber: To,
                callerNumber: From,
                forwardingNumber: phoneSettings.forwardingNumber,
                callSid: CallSid,
                callStatus: CallStatus || 'initiated',
                callDirection: Direction || 'inbound',
                callStartTime: new Date(),
                twilioData: callData,
                // Add porting context
                isPortedNumber: phoneSettings.isPortedNumber(),
                numberSetupType: phoneSettings.alternativeSetup.setupType,
                businessDisplayNumber: phoneSettings.getBusinessDisplayNumber()
            });

            await callLog.save();
            console.log(`📋 Call log created: ${callLog._id}`);

            // Update phone settings analytics
            await phoneSettings.incrementAnalytic('totalCalls');

            // Generate TwiML for call forwarding
            const twiml = this.twilioService.generateCallForwardingTwiML(
                phoneSettings.forwardingNumber,
                business.businessName
            );

            return {
                success: true,
                twiml: twiml,
                callLogId: callLog._id,
                businessId: phoneSettings.businessId
            };

        } catch (error) {
            console.error('❌ Error handling incoming call:', error);
            return this.generateErrorResponse('Internal error processing call');
        }
    }

    // Handle call status updates from Twilio
    async handleCallStatusUpdate(statusData) {
        try {
            console.log('📊 Processing call status update:', statusData);
            
            const { CallSid, CallStatus, DialCallStatus, CallDuration, DialCallDuration } = statusData;

            // Find the call log
            const callLog = await CallLog.findOne({ callSid: CallSid });
            if (!callLog) {
                console.error(`❌ Call log not found for CallSid: ${CallSid}`);
                return { success: false, error: 'Call log not found' };
            }

            // Update call log with status
            callLog.callStatus = CallStatus;
            callLog.callDuration = parseInt(CallDuration) || 0;
            callLog.callEndTime = new Date();
            
            // Add dial status data
            if (statusData.DialCallStatus) {
                callLog.twilioData.dialCallStatus = DialCallStatus;
                callLog.twilioData.dialCallDuration = DialCallDuration;
            }

            // Check if this was a missed call
            const isMissedCall = this.isMissedCall(CallStatus, DialCallStatus);
            
            if (isMissedCall) {
                await this.handleMissedCall(callLog);
            } else {
                console.log(`✅ Call answered successfully: ${CallSid}`);
            }

            await callLog.save();

            return {
                success: true,
                callLogId: callLog._id,
                isMissedCall: isMissedCall,
                status: CallStatus
            };

        } catch (error) {
            console.error('❌ Error handling call status update:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle missed call logic
    async handleMissedCall(callLog) {
        try {
            console.log(`📞❌ Processing missed call for: ${callLog.callerNumber}`);

            // Mark as missed call
            await callLog.markAsMissed();

            // Update analytics
            const phoneSettings = await PhoneSettings.findOne({ businessId: callLog.businessId });
            if (phoneSettings) {
                await phoneSettings.incrementAnalytic('missedCalls');
            }

            // Trigger SMS after configured delay
            const smsResult = await this.smsService.sendMissedCallSMS(
                callLog.businessId,
                callLog.callerNumber,
                callLog._id
            );

            if (smsResult.sent || smsResult.scheduled) {
                await callLog.markSMSSent();
                console.log(`📱 SMS triggered for missed call: ${callLog.callSid}`);
            }

            // Emit real-time notification (if WebSocket is available)
            this.emitMissedCallNotification(callLog, smsResult);

            return {
                success: true,
                smsTriggered: smsResult.sent || smsResult.scheduled,
                smsResult: smsResult
            };

        } catch (error) {
            console.error('❌ Error handling missed call:', error);
            throw error;
        }
    }

    // Determine if a call was missed based on Twilio status
    isMissedCall(callStatus, dialCallStatus) {
        const missedStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
        
        // Check dial status first (more specific)
        if (dialCallStatus && missedStatuses.includes(dialCallStatus)) {
            return true;
        }
        
        // Fallback to call status
        if (callStatus && missedStatuses.includes(callStatus)) {
            return true;
        }
        
        return false;
    }

    // Generate call analytics for a business
    async getCallAnalytics(businessId, timeframe = '7d') {
        try {
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            const calls = await CallLog.find({
                businessId,
                createdAt: { $gte: startDate }
            }).sort({ createdAt: -1 });

            const analytics = {
                totalCalls: calls.length,
                answeredCalls: calls.filter(call => !call.isMissedCall).length,
                missedCalls: calls.filter(call => call.isMissedCall).length,
                smsTriggered: calls.filter(call => call.smsTriggered).length,
                smsResponses: calls.filter(call => call.smsResponse).length,
                averageCallDuration: 0,
                peakHours: {},
                conversionRate: 0
            };

            // Calculate averages
            const answeredCalls = calls.filter(call => !call.isMissedCall && call.callDuration > 0);
            if (answeredCalls.length > 0) {
                analytics.averageCallDuration = Math.round(
                    answeredCalls.reduce((sum, call) => sum + call.callDuration, 0) / answeredCalls.length
                );
            }

            // Calculate peak hours
            calls.forEach(call => {
                const hour = moment(call.callStartTime).format('HH');
                analytics.peakHours[hour] = (analytics.peakHours[hour] || 0) + 1;
            });

            // Calculate conversion rate (SMS sent and response received)
            if (analytics.smsTriggered > 0) {
                analytics.conversionRate = Math.round((analytics.smsResponses / analytics.smsTriggered) * 100);
            }

            return analytics;

        } catch (error) {
            console.error('❌ Error generating call analytics:', error);
            throw error;
        }
    }

    // Get call trends for charts
    async getCallTrends(businessId, timeframe = '7d') {
        try {
            const startDate = moment().subtract(parseInt(timeframe), timeframe.slice(-1)).toDate();
            
            const calls = await CallLog.find({
                businessId,
                createdAt: { $gte: startDate }
            }).sort({ createdAt: 1 });

            // Generate trends based on timeframe
            let trends = [];
            
            if (timeframe === '24h' || timeframe === '1d') {
                // Hourly trends for 24 hours
                for (let i = 23; i >= 0; i--) {
                    const hourStart = moment().subtract(i, 'hours').startOf('hour');
                    const hourEnd = moment().subtract(i, 'hours').endOf('hour');
                    
                    const hourCalls = calls.filter(call => 
                        moment(call.callStartTime).isBetween(hourStart, hourEnd, null, '[]')
                    );
                    
                    trends.push({
                        time: hourStart.format('HH:mm'),
                        date: hourStart.format('YYYY-MM-DD'),
                        hour: hourStart.format('HH'),
                        totalCalls: hourCalls.length,
                        answeredCalls: hourCalls.filter(call => !call.isMissedCall).length,
                        missedCalls: hourCalls.filter(call => call.isMissedCall).length
                    });
                }
            } else if (timeframe === '7d') {
                // Daily trends for 7 days
                for (let i = 6; i >= 0; i--) {
                    const dayStart = moment().subtract(i, 'days').startOf('day');
                    const dayEnd = moment().subtract(i, 'days').endOf('day');
                    
                    const dayCalls = calls.filter(call => 
                        moment(call.callStartTime).isBetween(dayStart, dayEnd, null, '[]')
                    );
                    
                    trends.push({
                        time: dayStart.format('MM/DD'),
                        date: dayStart.format('YYYY-MM-DD'),
                        totalCalls: dayCalls.length,
                        answeredCalls: dayCalls.filter(call => !call.isMissedCall).length,
                        missedCalls: dayCalls.filter(call => call.isMissedCall).length
                    });
                }
            } else {
                // Weekly trends for 30d/90d
                const weeks = timeframe === '30d' ? 4 : 12;
                for (let i = weeks - 1; i >= 0; i--) {
                    const weekStart = moment().subtract(i, 'weeks').startOf('week');
                    const weekEnd = moment().subtract(i, 'weeks').endOf('week');
                    
                    const weekCalls = calls.filter(call => 
                        moment(call.callStartTime).isBetween(weekStart, weekEnd, null, '[]')
                    );
                    
                    trends.push({
                        time: `Week of ${weekStart.format('MM/DD')}`,
                        date: weekStart.format('YYYY-MM-DD'),
                        totalCalls: weekCalls.length,
                        answeredCalls: weekCalls.filter(call => !call.isMissedCall).length,
                        missedCalls: weekCalls.filter(call => call.isMissedCall).length
                    });
                }
            }

            return trends;

        } catch (error) {
            console.error('❌ Error generating call trends:', error);
            throw error;
        }
    }

    // Get recent missed calls for a business
    async getRecentMissedCalls(businessId, limit = 20) {
        try {
            const missedCalls = await CallLog.find({
                businessId,
                isMissedCall: true
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('leadId');

            return missedCalls.map(call => ({
                callId: call._id,
                callerNumber: call.formattedCallerNumber,
                callTime: call.callStartTime,
                smsTriggered: call.smsTriggered,
                smsResponse: call.smsResponse,
                leadCreated: call.leadCreated,
                timeAgo: moment(call.callStartTime).fromNow()
            }));

        } catch (error) {
            console.error('❌ Error getting recent missed calls:', error);
            throw error;
        }
    }

    // Handle voicemail (if enabled)
    async handleVoicemail(voicemailData) {
        try {
            console.log('🎤 Processing voicemail:', voicemailData);
            
            const { CallSid, RecordingUrl, TranscriptionText } = voicemailData;
            
            // Find the call log
            const callLog = await CallLog.findOne({ callSid: CallSid });
            if (!callLog) {
                console.error(`❌ Call log not found for voicemail: ${CallSid}`);
                return { success: false, error: 'Call log not found' };
            }

            // Update call log with voicemail info
            callLog.notes = TranscriptionText || 'Voicemail received';
            if (RecordingUrl) {
                callLog.twilioData.recordingUrl = RecordingUrl;
            }
            
            await callLog.save();

            // If we haven't already sent SMS for this missed call, send it now
            if (!callLog.smsTriggered) {
                await this.handleMissedCall(callLog);
            }

            return {
                success: true,
                callLogId: callLog._id,
                transcription: TranscriptionText
            };

        } catch (error) {
            console.error('❌ Error handling voicemail:', error);
            return { success: false, error: error.message };
        }
    }

    // Emit real-time notification for missed calls
    emitMissedCallNotification(callLog, smsResult) {
        // This would integrate with your WebSocket system
        // For now, just log the notification
        console.log(`🔔 NOTIFICATION: Missed call from ${callLog.formattedCallerNumber}`);
        console.log(`📱 SMS ${smsResult.sent ? 'sent' : 'scheduled'} for follow-up`);
        
        // TODO: Integrate with WebSocket to push to dashboard
        // io.emit('missedCall', {
        //     businessId: callLog.businessId,
        //     callerNumber: callLog.formattedCallerNumber,
        //     callTime: callLog.callStartTime,
        //     smsTriggered: smsResult.sent || smsResult.scheduled
        // });
    }

    // Generate error response TwiML
    generateErrorResponse(message) {
        const twiml = this.twilioService.generateVoicemailTwiML(
            'Our Practice',
            `We're experiencing technical difficulties. Please call back or visit our website.`
        );
        
        return {
            success: false,
            error: message,
            twiml: twiml
        };
    }

    // Health check for call handling system
    async healthCheck() {
        try {
            const checks = {
                twilioService: await this.twilioService.healthCheck(),
                database: await this.checkDatabaseConnection(),
                phoneSettings: await this.checkPhoneSettings()
            };

            const allHealthy = Object.values(checks).every(check => 
                check.status === 'healthy' || check.status === 'mock'
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

    // Check database connection
    async checkDatabaseConnection() {
        try {
            await CallLog.findOne().limit(1);
            return { status: 'healthy', message: 'Database connection working' };
        } catch (error) {
            return { status: 'error', message: 'Database connection failed' };
        }
    }

    // Check phone settings configuration
    async checkPhoneSettings() {
        try {
            const activeSettings = await PhoneSettings.countDocuments({ status: 'active' });
            return { 
                status: 'healthy', 
                message: `${activeSettings} active phone configurations` 
            };
        } catch (error) {
            return { status: 'error', message: 'Failed to check phone settings' };
        }
    }
}

// Export singleton instance
const callHandlingService = new CallHandlingService();
export default callHandlingService; 