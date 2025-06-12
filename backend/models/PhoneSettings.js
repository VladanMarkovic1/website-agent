import mongoose from "mongoose";

const phoneSettingsSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        unique: true
    },
    // Phone number configuration - supports multiple scenarios
    trackingNumber: {
        type: String,
        required: true,
        unique: true
    },
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
    smsEnabled: {
        type: Boolean,
        default: true
    },
    autoResponseEnabled: {
        type: Boolean,
        default: true
    },
    missedCallTemplate: {
        type: String,
        default: "Hi! We noticed you called {businessName} but we missed your call. We'd love to help! What can we assist you with today? Reply STOP to opt out."
    },
    analytics: {
        totalCalls: { type: Number, default: 0 },
        missedCalls: { type: Number, default: 0 },
        smssSent: { type: Number, default: 0 },
        smsResponses: { type: Number, default: 0 },
        leadsGenerated: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },
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

// Method to add error
phoneSettingsSchema.methods.addError = function(type, message) {
    this.errorLogs.push({
        type: type,
        message: message,
        timestamp: new Date(),
        resolved: false
    });
    // Keep only last 10 errors
    if (this.errorLogs.length > 10) {
        this.errorLogs = this.errorLogs.slice(-10);
    }
    return this.save();
};

export default mongoose.model("PhoneSettings", phoneSettingsSchema); 