import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    trackingNumber: {
        type: String,
        required: true,
        index: true
    },
    callerNumber: {
        type: String,
        required: true,
        index: true
    },
    forwardingNumber: {
        type: String,
        required: true
    },
    callSid: {
        type: String,
        required: true,
        unique: true // Twilio Call SID is unique
    },
    callStatus: {
        type: String,
        enum: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'no-answer', 'canceled', 'failed'],
        required: true
    },
    callDuration: {
        type: Number, // Duration in seconds
        default: 0
    },
    callDirection: {
        type: String,
        enum: ['inbound', 'outbound'],
        default: 'inbound'
    },
    isMissedCall: {
        type: Boolean,
        default: false,
        index: true
    },
    smsTriggered: {
        type: Boolean,
        default: false
    },
    smsResponse: {
        type: Boolean,
        default: false
    },
    leadCreated: {
        type: Boolean,
        default: false
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        default: null
    },
    callStartTime: {
        type: Date,
        required: true
    },
    callEndTime: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    // Number porting context
    isPortedNumber: {
        type: Boolean,
        default: false
    },
    numberSetupType: {
        type: String,
        enum: ['ported', 'new_tracking', 'call_forwarding', 'hybrid'],
        default: 'new_tracking'
    },
    businessDisplayNumber: {
        type: String,
        default: null // The number customers see/dial
    },
    // Twilio specific data
    twilioData: {
        accountSid: String,
        from: String,
        to: String,
        callerId: String,
        direction: String,
        forwardedFrom: String,
        dialCallStatus: String,
        dialCallDuration: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
callLogSchema.index({ businessId: 1, createdAt: -1 });
callLogSchema.index({ callerNumber: 1, businessId: 1 });
callLogSchema.index({ trackingNumber: 1, createdAt: -1 });
callLogSchema.index({ isMissedCall: 1, createdAt: -1 });

// Virtual for formatted caller number
callLogSchema.virtual('formattedCallerNumber').get(function() {
    const number = this.callerNumber;
    if (number && number.length === 12 && number.startsWith('+1')) {
        const cleaned = number.substring(2);
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return number;
});

// Method to mark as missed call with SMS trigger
callLogSchema.methods.markAsMissed = function() {
    this.isMissedCall = true;
    this.callStatus = 'no-answer';
    return this.save();
};

// Method to mark SMS as sent
callLogSchema.methods.markSMSSent = function() {
    this.smsTriggered = true;
    return this.save();
};

// Static method to find recent missed calls for a business
callLogSchema.statics.findRecentMissedCalls = function(businessId, hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.find({
        businessId: businessId,
        isMissedCall: true,
        createdAt: { $gte: cutoffTime }
    }).sort({ createdAt: -1 });
};

export default mongoose.model("CallLog", callLogSchema); 