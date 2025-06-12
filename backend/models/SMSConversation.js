import mongoose from "mongoose";

// Schema for individual SMS messages within a conversation
const smsMessageSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageSid: {
        type: String,
        required: true, // Twilio message SID
        unique: true
    },
    status: {
        type: String,
        enum: ['queued', 'sent', 'delivered', 'undelivered', 'failed', 'received'],
        default: 'queued'
    },
    errorCode: {
        type: String,
        default: null
    },
    errorMessage: {
        type: String,
        default: null
    },
    mediaUrls: [{
        type: String // URLs for any media attachments
    }],
    timestamp: {
        type: Date,
        default: Date.now
    },
    isAutoResponse: {
        type: Boolean,
        default: false
    },
    responseToCallId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CallLog',
        default: null
    }
}, { _id: true }); // Keep _id for individual messages

const smsConversationSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    trackingNumber: {
        type: String,
        required: true,
        index: true
    },
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    messages: [smsMessageSchema],
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
    // Contact information extracted from conversation
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
    // Auto-response settings
    autoResponseEnabled: {
        type: Boolean,
        default: true
    },
    lastAutoResponseAt: {
        type: Date,
        default: null
    },
    // Analytics data
    analytics: {
        totalMessages: { type: Number, default: 0 },
        inboundMessages: { type: Number, default: 0 },
        outboundMessages: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 }, // in minutes
        conversationDuration: { type: Number, default: 0 }, // in minutes
        converted: { type: Boolean, default: false }
    },
    // Compliance tracking
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
        default: false // Will be true for missed call follow-ups (implied consent)
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
smsConversationSchema.index({ businessId: 1, lastMessageAt: -1 });
smsConversationSchema.index({ phoneNumber: 1, businessId: 1 });
smsConversationSchema.index({ status: 1, lastMessageAt: -1 });
smsConversationSchema.index({ triggeredByMissedCall: 1, createdAt: -1 });

// Virtual for formatted phone number
smsConversationSchema.virtual('formattedPhoneNumber').get(function() {
    const number = this.phoneNumber;
    if (number && number.length === 12 && number.startsWith('+1')) {
        const cleaned = number.substring(2);
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return number;
});

// Virtual for latest message
smsConversationSchema.virtual('latestMessage').get(function() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Virtual for conversation age in hours
smsConversationSchema.virtual('ageInHours').get(function() {
    return Math.round((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Method to add a new message
smsConversationSchema.methods.addMessage = function(messageData) {
    this.messages.push(messageData);
    this.lastMessageAt = new Date();
    
    // Update analytics
    this.analytics.totalMessages += 1;
    if (messageData.direction === 'inbound') {
        this.analytics.inboundMessages += 1;
    } else {
        this.analytics.outboundMessages += 1;
    }
    
    return this.save();
};

// Method to mark as opted out
smsConversationSchema.methods.optOut = function() {
    this.status = 'opted-out';
    this.optOutRequested = true;
    this.optOutAt = new Date();
    return this.save();
};

// Method to check if conversation is stale (no activity for X hours)
smsConversationSchema.methods.isStale = function(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.lastMessageAt < cutoff;
};

// Static method to find active conversations for a business
smsConversationSchema.statics.findActiveConversations = function(businessId) {
    return this.find({
        businessId: businessId,
        status: 'active',
        optOutRequested: false
    }).sort({ lastMessageAt: -1 });
};

// Static method to find conversations that need follow-up
smsConversationSchema.statics.findPendingFollowUps = function(businessId, hours = 2) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.find({
        businessId: businessId,
        status: 'active',
        lastMessageAt: { $lt: cutoff },
        'messages.direction': 'inbound', // Last message was from customer
        optOutRequested: false
    });
};

export default mongoose.model("SMSConversation", smsConversationSchema); 