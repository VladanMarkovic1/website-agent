import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    service: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'attempted-contact', 'contacted', 'scheduled', 'completed', 'no-response'],
        default: 'new'
    },
    bestTimeToCall: {
        type: String,
        enum: ['now', 'next-business-day', 'morning', 'afternoon', 'evening'],
        default: 'now'
    },
    emailHistory: [{
        type: {
            type: String,
            enum: ['confirmation', 'followUp', 'reminder'],
            required: true
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['sent', 'failed', 'opened', 'clicked'],
            default: 'sent'
        },
        emailId: String,
        previewUrl: String,
        template: String,
        error: String
    }],
    emailCommunication: {
        lastEmailSent: Date,
        totalEmailsSent: {
            type: Number,
            default: 0
        },
        hasResponded: {
            type: Boolean,
            default: false
        },
        unsubscribed: {
            type: Boolean,
            default: false
        },
        nextScheduledEmail: Date
    },
    callHistory: [{
        status: String,
        notes: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastContactedAt: {
        type: Date,
        default: Date.now
    },
    scheduledConsultation: {
        date: Date,
        confirmed: {
            type: Boolean,
            default: false
        },
        notes: String,
        remindersSent: [{
            type: Date
        }]
    },
    interactions: [{
        type: {
            type: String,
            enum: ['email', 'call', 'sms', 'consultation', 'chatbot', 'Status Update'],
            required: true
        },
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        message: String,
        service: String
    }]
});

// Index for efficient queries
leadSchema.index({ businessId: 1, createdAt: -1 });
leadSchema.index({ status: 1, lastContactedAt: 1 });
leadSchema.index({ phone: 1, businessId: 1 }, { unique: true });
leadSchema.index({ 'emailCommunication.nextScheduledEmail': 1 });
leadSchema.index({ 'emailCommunication.lastEmailSent': 1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
