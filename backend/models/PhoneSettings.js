import mongoose from "mongoose";

const phoneSettingsSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    // Phone number configuration - supports multiple scenarios
    trackingNumber: { type: String, required: true, unique: true },
    forwardingNumber: {
        type: String,
        required: true
    },
    // Number porting configuration
    numberPorting: {
        isPortedNumber: {
            type: Boolean,
            default: false
        },
        originalNumber: {
            type: String,
            default: null
        },
        originalCarrier: {
            type: String,
            default: null
        },
        portingDate: {
            type: Date,
            default: null
        },
        portingStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'not_applicable'],
            default: 'not_applicable'
        }
    },
    // Alternative number setup (for businesses that don't want to port)
    alternativeSetup: {
        businessRealNumber: {
            type: String,
            default: null
        },
        setupType: {
            type: String,
            enum: ['ported', 'new_tracking', 'call_forwarding', 'hybrid'],
            default: 'new_tracking'
        },
        notes: {
            type: String,
            default: ''
        }
    },
    // SMS Configuration
    smsEnabled: {
        type: Boolean,
        default: true
    },
    autoResponseEnabled: {
        type: Boolean,
        default: true
    },
    // SMS Templates
    missedCallTemplate: {
        type: String,
        default: "Hi! We noticed you called {businessName} but we missed your call. We'd love to help! What can we assist you with today? Reply STOP to opt out."
    },
    businessHoursTemplate: {
        type: String,
        default: "Thanks for contacting {businessName}! We're currently helping other patients. We'll respond shortly. What can we help you with?"
    },
    afterHoursTemplate: {
        type: String,
        default: "Thanks for contacting {businessName}! We're currently closed but will respond first thing tomorrow. What can we help you with?"
    },
    appointmentConfirmationTemplate: {
        type: String,
        default: "Thanks! We'll call you back within 24 hours to schedule your appointment. Is this the best number to reach you?"
    },
    // Business Hours Configuration
    businessHours: {
        monday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "17:00" }, 
            enabled: { type: Boolean, default: true }
        },
        tuesday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "17:00" }, 
            enabled: { type: Boolean, default: true }
        },
        wednesday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "17:00" }, 
            enabled: { type: Boolean, default: true }
        },
        thursday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "17:00" }, 
            enabled: { type: Boolean, default: true }
        },
        friday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "17:00" }, 
            enabled: { type: Boolean, default: true }
        },
        saturday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "13:00" }, 
            enabled: { type: Boolean, default: false }
        },
        sunday: { 
            start: { type: String, default: "09:00" }, 
            end: { type: String, default: "13:00" }, 
            enabled: { type: Boolean, default: false }
        }
    },
    timeZone: {
        type: String,
        default: "America/New_York"
    },
    // Response timing settings
    responseSettings: {
        missedCallDelayMinutes: {
            type: Number,
            default: 2, // Wait 2 minutes before sending SMS
            min: 1,
            max: 30
        },
        autoResponseDelaySeconds: {
            type: Number,
            default: 30, // Wait 30 seconds before auto-responding to SMS
            min: 10,
            max: 300
        },
        followUpEnabled: {
            type: Boolean,
            default: true
        },
        followUpDelayHours: {
            type: Number,
            default: 4, // Follow up after 4 hours if no response
            min: 1,
            max: 24
        }
    },
    // Call handling preferences
    callSettings: {
        ringTimeoutSeconds: {
            type: Number,
            default: 30,
            min: 15,
            max: 60
        },
        enableVoicemail: {
            type: Boolean,
            default: false
        },
        voicemailMessage: {
            type: String,
            default: "You've reached {businessName}. Please leave a message and we'll call you back, or you can text us for a faster response."
        }
    },
    // Twilio configuration
    twilioConfig: {
        accountSid: {
            type: String,
            required: true,
            select: false // Don't return in normal queries
        },
        authToken: {
            type: String,
            required: true,
            select: false // Don't return in normal queries
        },
        webhookUrl: {
            type: String,
            required: true
        }
    },
    // Analytics and performance tracking
    analytics: {
        totalCalls: { type: Number, default: 0 },
        missedCalls: { type: Number, default: 0 },
        smssSent: { type: Number, default: 0 },
        smsResponses: { type: Number, default: 0 },
        leadsGenerated: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },
    // Status and health monitoring
    status: {
        type: String,
        enum: ['active', 'paused', 'suspended', 'setup'],
        default: 'setup'
    },
    lastCallReceived: {
        type: Date,
        default: null
    },
    lastSMSSent: {
        type: Date,
        default: null
    },
    // Error tracking
    errorLogs: [{
        type: {
            type: String,
            enum: ['call_forwarding', 'sms_sending', 'webhook', 'configuration']
        },
        message: String,
        timestamp: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false }
    }],
    // Feature flags
    features: {
        emergencyDetection: { type: Boolean, default: true },
        appointmentBooking: { type: Boolean, default: true },
        leadScoring: { type: Boolean, default: true },
        autoFollowUp: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Indexes for performance
phoneSettingsSchema.index({ businessId: 1 });
phoneSettingsSchema.index({ trackingNumber: 1 });
phoneSettingsSchema.index({ status: 1 });

// Virtual for formatted tracking number
phoneSettingsSchema.virtual('formattedTrackingNumber').get(function() {
    const number = this.trackingNumber;
    if (number && number.length === 12 && number.startsWith('+1')) {
        const cleaned = number.substring(2);
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return number;
});

// Virtual for formatted forwarding number
phoneSettingsSchema.virtual('formattedForwardingNumber').get(function() {
    const number = this.forwardingNumber;
    if (number && number.length === 12 && number.startsWith('+1')) {
        const cleaned = number.substring(2);
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return number;
});

// Method to check if currently in business hours
phoneSettingsSchema.methods.isBusinessHours = function() {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todayHours = this.businessHours[dayName];
    if (!todayHours || !todayHours.enabled) {
        return false;
    }
    
    return currentTime >= todayHours.start && currentTime <= todayHours.end;
};

// Method to get appropriate SMS template based on time
phoneSettingsSchema.methods.getSMSTemplate = function(type = 'missed_call') {
    if (type === 'missed_call') {
        return this.missedCallTemplate;
    } else if (this.isBusinessHours()) {
        return this.businessHoursTemplate;
    } else {
        return this.afterHoursTemplate;
    }
};

// Method to update analytics
phoneSettingsSchema.methods.incrementAnalytic = function(field) {
    this.analytics[field] = (this.analytics[field] || 0) + 1;
    if (field === 'missedCalls') {
        this.lastCallReceived = new Date();
    } else if (field === 'smssSent') {
        this.lastSMSSent = new Date();
    }
    return this.save();
};

// Method to add error
phoneSettingsSchema.methods.addError = function(type, message) {
    this.errorLogs.push({
        type: type,
        message: message,
        timestamp: new Date(),
        resolved: false
    });
    if (this.errorLogs.length > 10) {
        this.errorLogs = this.errorLogs.slice(-10);
    }
    return this.save();
};

// Static method to find settings by tracking number (enhanced for porting)
phoneSettingsSchema.statics.findByTrackingNumber = function(trackingNumber) {
    return this.findOne({ trackingNumber: trackingNumber, status: 'active' });
};

// Enhanced static method to find settings by any number (tracking, real, or ported)
phoneSettingsSchema.statics.findByAnyNumber = function(phoneNumber) {
    return this.findOne({
        $and: [
            { status: 'active' },
            {
                $or: [
                    { trackingNumber: phoneNumber },
                    { 'alternativeSetup.businessRealNumber': phoneNumber },
                    { 'numberPorting.originalNumber': phoneNumber }
                ]
            }
        ]
    });
};

// Static method to find ported numbers
phoneSettingsSchema.statics.findPortedNumbers = function() {
    return this.find({ 
        'numberPorting.isPortedNumber': true,
        'numberPorting.portingStatus': 'completed',
        status: 'active' 
    });
};

// Static method to get active phone settings
phoneSettingsSchema.statics.findActiveSettings = function() {
    return this.find({ status: 'active' });
};

// Method to check if this is a ported number setup
phoneSettingsSchema.methods.isPortedNumber = function() {
    return this.numberPorting && this.numberPorting.isPortedNumber && 
           this.numberPorting.portingStatus === 'completed';
};

// Method to get the business display number (what customers see)
phoneSettingsSchema.methods.getBusinessDisplayNumber = function() {
    if (this.isPortedNumber()) {
        // For ported numbers, the tracking number IS their original business number
        return this.trackingNumber;
    } else if (this.alternativeSetup.businessRealNumber) {
        // For businesses keeping their real number separate
        return this.alternativeSetup.businessRealNumber;
    } else {
        // New tracking number setup
        return this.trackingNumber;
    }
};

// Method to get the description of number setup
phoneSettingsSchema.methods.getNumberSetupDescription = function() {
    if (this.isPortedNumber()) {
        return `Ported from ${this.numberPorting.originalCarrier || 'previous carrier'} on ${this.numberPorting.portingDate?.toLocaleDateString() || 'unknown date'}`;
    } else if (this.alternativeSetup.setupType === 'hybrid') {
        return `Hybrid setup: Business number ${this.alternativeSetup.businessRealNumber}, Tracking number ${this.trackingNumber}`;
    } else if (this.alternativeSetup.setupType === 'call_forwarding') {
        return `Call forwarding from ${this.alternativeSetup.businessRealNumber} to ${this.trackingNumber}`;
    } else {
        return `New tracking number: ${this.trackingNumber}`;
    }
};

export default mongoose.model("PhoneSettings", phoneSettingsSchema); 