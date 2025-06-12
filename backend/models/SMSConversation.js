import mongoose from "mongoose";

const smsConversationSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    trackingNumber: {
        type: String,
        required: true
    },
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    messages: [/* reference to smsMessageSchema or inline schema */],
    status: {
        type: String,
        enum: ['active', 'paused', 'closed', 'opted-out'],
        default: 'active'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    isFirstContact: {
        type: Boolean,
        default: true
    },
    triggeredByMissedCall: {
        type: Boolean,
        default: false
    },
    relatedCallId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CallLog',
        default: null
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
    extractedInfo: {
        name: { type: String, default: null },
        email: { type: String, default: null },
        serviceInterest: { type: String, default: null },
        urgency: { 
            type: String, 
            enum: ['low', 'medium', 'high', 'emergency'],
            default: 'medium'
        },
        appointmentRequested: { type: Boolean, default: false },
        bestTimeToCall: { type: String, default: null }
    },
    autoResponseEnabled: {
        type: Boolean,
        default: true
    },
    lastAutoResponseAt: {
        type: Date,
        default: null
    },
    analytics: {
        totalMessages: { type: Number, default: 0 },
        inboundMessages: { type: Number, default: 0 },
        outboundMessages: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        conversationDuration: { type: Number, default: 0 },
        converted: { type: Boolean, default: false }
    },
    optOutRequested: {
        type: Boolean,
        default: false
    },
    optOutAt: {
        type: Date,
        default: null
    },
    consentGiven: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

smsConversationSchema.index({ businessId: 1, lastMessageAt: -1 });
smsConversationSchema.index({ phoneNumber: 1, businessId: 1 });

export default mongoose.model("SMSConversation", smsConversationSchema); 