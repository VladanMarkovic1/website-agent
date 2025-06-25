import PhoneSettings from '../models/PhoneSettings.js';
import Business from '../models/Business.js';
import twilioService from './twilioService.js';

class NumberPortingService {
    constructor() {
        this.twilioService = twilioService;
    }

    // Set up ported number for business (Option A)
    async setupPortedNumber(businessId, portedNumber, originalCarrier, forwardingNumber) {
        try {
            // Validate inputs
            if (!businessId || !portedNumber || !forwardingNumber) {
                throw new Error('Business ID, ported number, and forwarding number are required');
            }

            // Check if business exists
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error('Business not found');
            }

            // Check if number is already in use
            const existingSettings = await PhoneSettings.findByAnyNumber(portedNumber);
            if (existingSettings) {
                throw new Error('This number is already configured for another business');
            }

            // Create phone settings for ported number
            const phoneSettings = new PhoneSettings({
                businessId,
                trackingNumber: portedNumber, // The ported number becomes the tracking number
                forwardingNumber: forwardingNumber, // Where calls get forwarded
                
                // Number porting configuration
                numberPorting: {
                    isPortedNumber: true,
                    originalNumber: portedNumber, // Same as tracking number
                    originalCarrier: originalCarrier,
                    portingDate: new Date(),
                    portingStatus: 'completed'
                },
                
                // Setup type
                alternativeSetup: {
                    setupType: 'ported',
                    notes: `Number ported from ${originalCarrier} to Twilio for call tracking`
                },
                
                // Default configuration
                status: 'active',
                
                // Twilio configuration (will be set when webhooks are configured)
                twilioConfig: {
                    accountSid: process.env.TWILIO_ACCOUNT_SID || 'mock_account_sid',
                    authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token',
                    webhookUrl: process.env.WEBHOOK_BASE_URL || 'https://yourapp.com/webhooks'
                }
            });

            await phoneSettings.save();

            return {
                success: true,
                phoneSettingsId: phoneSettings._id,
                businessDisplayNumber: phoneSettings.getBusinessDisplayNumber(),
                setupDescription: phoneSettings.getNumberSetupDescription(),
                configuration: {
                    customerDialsNumber: portedNumber,
                    callForwardsTo: forwardingNumber,
                    twilioManages: true,
                    missedCallSMS: true
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Set up new tracking number for business (traditional approach)
    async setupTrackingNumber(businessId, forwardingNumber, preferredAreaCode = null) {
        try {
            // Check if business exists
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error('Business not found');
            }

            // For mock mode, generate a mock tracking number
            let trackingNumber;
            if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_ACCOUNT_SID) {
                trackingNumber = this.generateMockTrackingNumber(preferredAreaCode);
            } else {
                // In production, this would purchase a real Twilio number
                trackingNumber = await this.purchaseTwilioNumber(preferredAreaCode);
            }

            // Create phone settings
            const phoneSettings = new PhoneSettings({
                businessId,
                trackingNumber,
                forwardingNumber,
                
                // Number porting configuration (not applicable)
                numberPorting: {
                    isPortedNumber: false,
                    portingStatus: 'not_applicable'
                },
                
                // Setup type
                alternativeSetup: {
                    setupType: 'new_tracking',
                    notes: 'New Twilio tracking number for call tracking and SMS'
                },
                
                status: 'active',
                
                twilioConfig: {
                    accountSid: process.env.TWILIO_ACCOUNT_SID || 'mock_account_sid',
                    authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token',
                    webhookUrl: process.env.WEBHOOK_BASE_URL || 'https://yourapp.com/webhooks'
                }
            });

            await phoneSettings.save();

            return {
                success: true,
                phoneSettingsId: phoneSettings._id,
                trackingNumber: trackingNumber,
                businessDisplayNumber: phoneSettings.getBusinessDisplayNumber(),
                setupDescription: phoneSettings.getNumberSetupDescription(),
                configuration: {
                    customerDialsNumber: trackingNumber,
                    callForwardsTo: forwardingNumber,
                    updateMarketingMaterials: true,
                    missedCallSMS: true
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Set up hybrid approach (Option C)
    async setupHybridNumbers(businessId, businessRealNumber, forwardingNumber, preferredAreaCode = null) {
        try {
            // Check if business exists
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error('Business not found');
            }

            // Get tracking number for new marketing
            let trackingNumber;
            if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_ACCOUNT_SID) {
                trackingNumber = this.generateMockTrackingNumber(preferredAreaCode);
            } else {
                trackingNumber = await this.purchaseTwilioNumber(preferredAreaCode);
            }

            // Create phone settings that manage both numbers
            const phoneSettings = new PhoneSettings({
                businessId,
                trackingNumber, // New number for marketing
                forwardingNumber,
                
                // Number porting configuration
                numberPorting: {
                    isPortedNumber: false,
                    portingStatus: 'not_applicable'
                },
                
                // Alternative setup for hybrid approach
                alternativeSetup: {
                    businessRealNumber: businessRealNumber, // Their existing number
                    setupType: 'hybrid',
                    notes: `Hybrid setup: Existing number ${businessRealNumber} kept, new tracking number ${trackingNumber} for campaigns`
                },
                
                status: 'active',
                
                twilioConfig: {
                    accountSid: process.env.TWILIO_ACCOUNT_SID || 'mock_account_sid',
                    authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_auth_token',
                    webhookUrl: process.env.WEBHOOK_BASE_URL || 'https://yourapp.com/webhooks'
                }
            });

            await phoneSettings.save();

            return {
                success: true,
                phoneSettingsId: phoneSettings._id,
                businessRealNumber: businessRealNumber,
                trackingNumber: trackingNumber,
                setupDescription: phoneSettings.getNumberSetupDescription(),
                configuration: {
                    existingCustomersCall: businessRealNumber,
                    newMarketingUses: trackingNumber,
                    bothForwardTo: forwardingNumber,
                    gradualTransition: true,
                    missedCallSMS: true
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Generate mock tracking number for development
    generateMockTrackingNumber(preferredAreaCode = null) {
        const areaCode = preferredAreaCode || '555';
        const exchange = Math.floor(Math.random() * 900) + 100;
        const number = Math.floor(Math.random() * 9000) + 1000;
        return `+1${areaCode}${exchange}${number}`;
    }

    // Purchase real Twilio number (production)
    async purchaseTwilioNumber(preferredAreaCode = null) {
        try {
            // This would use Twilio API to purchase a real number
            // For now, return mock number
            return this.generateMockTrackingNumber(preferredAreaCode);
            
            // Production implementation would be:
            // const availableNumbers = await this.twilioService.client.availablePhoneNumbers('US')
            //     .local
            //     .list({ areaCode: preferredAreaCode, limit: 1 });
            // 
            // if (availableNumbers.length === 0) {
            //     throw new Error('No available numbers in preferred area code');
            // }
            // 
            // const number = await this.twilioService.client.incomingPhoneNumbers
            //     .create({ phoneNumber: availableNumbers[0].phoneNumber });
            // 
            // return number.phoneNumber;

        } catch (error) {
            throw error;
        }
    }

    // Get business number setup information
    async getBusinessNumberSetup(businessId) {
        try {
            const phoneSettings = await PhoneSettings.findOne({ businessId, status: 'active' });
            if (!phoneSettings) {
                return { configured: false, message: 'No phone configuration found' };
            }

            return {
                configured: true,
                businessId: phoneSettings.businessId,
                setupType: phoneSettings.alternativeSetup.setupType,
                isPortedNumber: phoneSettings.isPortedNumber(),
                businessDisplayNumber: phoneSettings.getBusinessDisplayNumber(),
                trackingNumber: phoneSettings.trackingNumber,
                forwardingNumber: phoneSettings.forwardingNumber,
                description: phoneSettings.getNumberSetupDescription(),
                status: phoneSettings.status,
                analytics: phoneSettings.analytics,
                configuration: this.getConfigurationSummary(phoneSettings)
            };

        } catch (error) {
            throw error;
        }
    }

    // Get configuration summary for dashboard
    getConfigurationSummary(phoneSettings) {
        const setupType = phoneSettings.alternativeSetup.setupType;
        
        switch (setupType) {
            case 'ported':
                return {
                    type: 'Number Porting',
                    customerExperience: 'Calls existing number, gets tracked and forwarded',
                    benefits: ['No marketing changes needed', 'Seamless customer experience'],
                    status: 'Active - customers call their usual number'
                };
            
            case 'new_tracking':
                return {
                    type: 'New Tracking Number',
                    customerExperience: 'Calls new tracking number, gets forwarded',
                    benefits: ['Full call tracking', 'SMS follow-up for missed calls'],
                    status: 'Active - use this number in all marketing'
                };
            
            case 'hybrid':
                return {
                    type: 'Hybrid Setup',
                    customerExperience: 'Existing customers use old number, new customers use tracking number',
                    benefits: ['Gradual transition', 'Track new marketing effectiveness'],
                    status: 'Active - both numbers forward to office'
                };
            
            default:
                return {
                    type: 'Unknown Configuration',
                    customerExperience: 'Configuration needs review',
                    benefits: [],
                    status: 'Needs attention'
                };
        }
    }

    // List all business setups
    async listAllBusinessSetups() {
        try {
            const allSettings = await PhoneSettings.find({ status: 'active' })
                .sort({ createdAt: -1 });

            return allSettings.map(settings => ({
                businessId: settings.businessId,
                setupType: settings.alternativeSetup.setupType,
                isPortedNumber: settings.isPortedNumber(),
                displayNumber: settings.getBusinessDisplayNumber(),
                trackingNumber: settings.trackingNumber,
                description: settings.getNumberSetupDescription(),
                analytics: {
                    totalCalls: settings.analytics.totalCalls,
                    missedCalls: settings.analytics.missedCalls,
                    smssSent: settings.analytics.smssSent
                }
            }));

        } catch (error) {
            throw error;
        }
    }

    // Health check for number porting service
    async healthCheck() {
        try {
            const checks = {
                phoneSettingsModel: await this.checkPhoneSettingsModel(),
                businessModel: await this.checkBusinessModel(),
                twilioService: await this.twilioService.healthCheck()
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

    async checkPhoneSettingsModel() {
        try {
            const count = await PhoneSettings.countDocuments({ status: 'active' });
            return { status: 'healthy', message: `${count} active phone configurations` };
        } catch (error) {
            return { status: 'error', message: 'PhoneSettings model check failed' };
        }
    }

    async checkBusinessModel() {
        try {
            await Business.findOne().limit(1);
            return { status: 'healthy', message: 'Business model accessible' };
        } catch (error) {
            return { status: 'error', message: 'Business model check failed' };
        }
    }
}

// Export singleton instance
const numberPortingService = new NumberPortingService();
export default numberPortingService; 