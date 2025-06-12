import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
        this.defaultFromNumber = process.env.DEFAULT_SMS_FROM_NUMBER;
        
        if (this.accountSid && this.authToken && this.accountSid !== 'placeholder_will_replace_later') {
            this.client = twilio(this.accountSid, this.authToken);
        } else {
            console.log('⚠️ Twilio credentials not configured - running in mock mode');
            this.client = null;
        }
    }

    // Generate TwiML for incoming call forwarding
    generateCallForwardingTwiML(forwardingNumber, businessName) {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        // Record the call for quality purposes (optional)
        // twiml.record({
        //     action: '/webhook/recording',
        //     maxLength: 1200, // 20 minutes max
        //     transcribe: false
        // });

        // Forward the call
        const dial = twiml.dial({
            timeout: parseInt(process.env.DEFAULT_RING_TIMEOUT_SECONDS) || 30,
            action: `${this.webhookBaseUrl}/voice-status`,
            method: 'POST',
            callerId: this.defaultFromNumber
        });

        dial.number(forwardingNumber);

        // If call is not answered, this will be handled by the action webhook
        return twiml.toString();
    }

    // Generate TwiML for voicemail (if enabled)
    generateVoicemailTwiML(businessName, voicemailMessage) {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        // Custom voicemail message
        const message = voicemailMessage.replace('{businessName}', businessName);
        twiml.say({
            voice: 'alice',
            language: 'en-US'
        }, message);

        // Record the voicemail
        twiml.record({
            action: `${this.webhookBaseUrl}/voicemail`,
            method: 'POST',
            maxLength: 300, // 5 minutes max
            transcribe: true,
            transcribeCallback: `${this.webhookBaseUrl}/voicemail-transcription`
        });

        return twiml.toString();
    }

    // Send SMS message
    async sendSMS(to, message, from = null) {
        const fromNumber = from || this.defaultFromNumber;

        if (!this.client) {
            console.log(`📱 [MOCK SMS] To: ${to}, From: ${fromNumber}, Message: ${message}`);
            return {
                sid: 'mock_sms_' + Date.now(),
                status: 'sent',
                to: to,
                from: fromNumber,
                body: message,
                dateCreated: new Date(),
                mock: true
            };
        }

        try {
            const sms = await this.client.messages.create({
                body: message,
                from: fromNumber,
                to: to
            });

            console.log(`✅ SMS sent successfully: ${sms.sid}`);
            return sms;
        } catch (error) {
            console.error('❌ Error sending SMS:', error);
            throw error;
        }
    }

    // Purchase a phone number for a business
    async purchasePhoneNumber(areaCode = null, businessName = '') {
        if (!this.client) {
            const mockNumber = `+1555${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
            console.log(`📞 [MOCK] Purchased phone number: ${mockNumber} for ${businessName}`);
            return {
                phoneNumber: mockNumber,
                friendlyName: `${businessName} Tracking Number`,
                capabilities: ['voice', 'sms'],
                mock: true
            };
        }

        try {
            // Search for available phone numbers
            const searchOptions = {
                voiceEnabled: true,
                smsEnabled: true,
                inRegion: 'US'
            };

            if (areaCode) {
                searchOptions.areaCode = areaCode;
            }

            const numbers = await this.client.availablePhoneNumbers('US')
                .local
                .list(searchOptions);

            if (numbers.length === 0) {
                throw new Error('No available phone numbers found');
            }

            // Purchase the first available number
            const purchasedNumber = await this.client.incomingPhoneNumbers.create({
                phoneNumber: numbers[0].phoneNumber,
                friendlyName: `${businessName} Tracking Number`,
                voiceUrl: `${this.webhookBaseUrl}/voice`,
                voiceMethod: 'POST',
                smsUrl: `${this.webhookBaseUrl}/sms`,
                smsMethod: 'POST',
                voiceFallbackUrl: `${this.webhookBaseUrl}/voice-fallback`,
                smsFallbackUrl: `${this.webhookBaseUrl}/sms-fallback`
            });

            console.log(`✅ Phone number purchased: ${purchasedNumber.phoneNumber}`);
            return purchasedNumber;
        } catch (error) {
            console.error('❌ Error purchasing phone number:', error);
            throw error;
        }
    }

    // Configure webhooks for an existing phone number
    async configurePhoneNumber(phoneNumber, businessName) {
        if (!this.client) {
            console.log(`📞 [MOCK] Configured webhooks for: ${phoneNumber}`);
            return { success: true, mock: true };
        }

        try {
            // Find the phone number
            const numbers = await this.client.incomingPhoneNumbers.list({
                phoneNumber: phoneNumber
            });

            if (numbers.length === 0) {
                throw new Error(`Phone number ${phoneNumber} not found in account`);
            }

            // Update webhook URLs
            const updatedNumber = await this.client.incomingPhoneNumbers(numbers[0].sid)
                .update({
                    friendlyName: `${businessName} Tracking Number`,
                    voiceUrl: `${this.webhookBaseUrl}/voice`,
                    voiceMethod: 'POST',
                    smsUrl: `${this.webhookBaseUrl}/sms`,
                    smsMethod: 'POST',
                    voiceFallbackUrl: `${this.webhookBaseUrl}/voice-fallback`,
                    smsFallbackUrl: `${this.webhookBaseUrl}/sms-fallback`
                });

            console.log(`✅ Phone number configured: ${updatedNumber.phoneNumber}`);
            return updatedNumber;
        } catch (error) {
            console.error('❌ Error configuring phone number:', error);
            throw error;
        }
    }

    // Get call details
    async getCallDetails(callSid) {
        if (!this.client) {
            return {
                sid: callSid,
                from: '+15551234567',
                to: '+15559876543',
                status: 'completed',
                duration: '120',
                mock: true
            };
        }

        try {
            const call = await this.client.calls(callSid).fetch();
            return call;
        } catch (error) {
            console.error('❌ Error fetching call details:', error);
            throw error;
        }
    }

    // Get SMS message details
    async getSMSDetails(messageSid) {
        if (!this.client) {
            return {
                sid: messageSid,
                from: '+15551234567',
                to: '+15559876543',
                body: 'Mock SMS message',
                status: 'delivered',
                mock: true
            };
        }

        try {
            const message = await this.client.messages(messageSid).fetch();
            return message;
        } catch (error) {
            console.error('❌ Error fetching SMS details:', error);
            throw error;
        }
    }

    // Validate webhook signature (security)
    validateWebhookSignature(signature, url, params) {
        if (!this.client) {
            console.log('📋 [MOCK] Webhook signature validation bypassed');
            return true;
        }

        const webhookSecret = process.env.TWILIO_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.warn('⚠️ TWILIO_WEBHOOK_SECRET not set - webhook validation disabled');
            return true;
        }

        try {
            return twilio.validateRequest(webhookSecret, signature, url, params);
        } catch (error) {
            console.error('❌ Webhook signature validation failed:', error);
            return false;
        }
    }

    // Helper method to format phone numbers
    formatPhoneNumber(phoneNumber) {
        // Remove all non-digits
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Add +1 if it's a US number without country code
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }
        
        return phoneNumber;
    }

    // Health check method
    async healthCheck() {
        if (!this.client) {
            return {
                status: 'mock',
                message: 'Twilio service running in mock mode',
                timestamp: new Date().toISOString()
            };
        }

        try {
            await this.client.accounts(this.accountSid).fetch();
            return {
                status: 'healthy',
                message: 'Twilio connection successful',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
const twilioService = new TwilioService();
export default twilioService; 