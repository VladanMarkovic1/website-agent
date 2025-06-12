import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true
    },
    trackingNumber: {
        type: String,
        required: true
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
        unique: true
    },
    callStatus: {
        type: String,
        enum: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'no-answer', 'canceled', 'failed'],
        required: true
    },
    callDuration: {
        type: Number,
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
        default: null
    },
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

callLogSchema.index({ businessId: 1, createdAt: -1 });
callLogSchema.index({ callerNumber: 1, businessId: 1 });
callLogSchema.index({ trackingNumber: 1, createdAt: -1 });

export default mongoose.model("CallLog", callLogSchema); 