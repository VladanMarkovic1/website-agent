import mongoose from 'mongoose';

const chatAnalyticsSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        sparse: true  // Allows null/undefined values
    },
    // Lead Generation Metrics
    totalLeads: {
        type: Number,
        default: 0
    },
    leadsByService: {
        type: Object,
        default: {}
    },
    leadStatus: {
        new: { type: Number, default: 0 },
        contacted: { type: Number, default: 0 },
        converted: { type: Number, default: 0 }
    },
    
    // Conversation Analytics
    totalConversations: {
        type: Number,
        default: 0
    },
    completedConversations: {
        type: Number,
        default: 0
    },
    hourlyActivity: {
        type: Object,
        default: {}
    },
    
    // Daily Summary
    conversionRate: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Create compound indexes
chatAnalyticsSchema.index({ businessId: 1, date: 1 }, { unique: true, sparse: true });

const ChatAnalytics = mongoose.model('ChatAnalytics', chatAnalyticsSchema);

export default ChatAnalytics; 