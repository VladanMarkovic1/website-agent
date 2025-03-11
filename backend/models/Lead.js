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
    status: {
        type: String,
        enum: ['new', 'attempted-contact', 'contacted', 'scheduled', 'completed', 'no-response'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['high', 'normal', 'low'],
        default: 'normal'
    },
    bestTimeToCall: {
        type: String,
        enum: ['now', 'next-business-day', 'morning', 'afternoon', 'evening'],
        default: 'now'
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
        notes: String
    }
});

// Index for efficient queries
leadSchema.index({ businessId: 1, createdAt: -1 });
leadSchema.index({ status: 1, priority: 1, lastContactedAt: 1 });
leadSchema.index({ phone: 1, businessId: 1 }, { unique: true });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
