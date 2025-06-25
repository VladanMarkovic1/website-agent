import mongoose from "mongoose";

// User Preference Schema
const UserPreferenceSchema = new mongoose.Schema({
    communicationStyle: { 
        type: String, 
        enum: ['formal', 'casual', 'detailed', 'brief'],
        default: 'casual'
    },
    preferredLanguage: { type: String, default: 'English' },
    timeZone: { type: String },
    appointmentPreferences: {
        preferredDays: [{ type: String }],
        preferredTimes: [{ type: String }],
        urgency: { 
            type: String, 
            enum: ['routine', 'urgent', 'emergency'],
            default: 'routine'
        }
    },
    insuranceInfo: {
        provider: { type: String },
        plan: { type: String },
        memberId: { type: String }
    },
    medicalHistory: {
        hasInsurance: { type: Boolean },
        isNewPatient: { type: Boolean, default: true },
        hasDentalAnxiety: { type: Boolean },
        specialNeeds: [{ type: String }]
    }
}, { _id: false });

// Conversation Flow Schema
const ConversationFlowSchema = new mongoose.Schema({
    stage: { 
        type: String, 
        enum: ['greeting', 'information_gathering', 'service_inquiry', 'appointment_request', 'contact_collection', 'confirmation', 'follow_up'],
        default: 'greeting'
    },
    subStage: { type: String },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    isCompleted: { type: Boolean, default: false }
}, { _id: false });

// Intent History Schema
const IntentHistorySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    intent: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1 },
    userMessage: { type: String },
    botResponse: { type: String },
    responseType: { type: String },
    wasHelpful: { type: Boolean },
    followUpRequired: { type: Boolean, default: false }
}, { _id: false });

// Service Interest Schema
const ServiceInterestSchema = new mongoose.Schema({
    serviceName: { type: String, required: true },
    interestLevel: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    firstMentioned: { type: Date, default: Date.now },
    lastMentioned: { type: Date, default: Date.now },
    mentionCount: { type: Number, default: 1 },
    questions: [{ type: String }],
    concerns: [{ type: String }]
}, { _id: false });

// Concern Schema
const ConcernSchema = new mongoose.Schema({
    concern: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['pain', 'appearance', 'function', 'emergency', 'cost', 'insurance', 'procedure', 'recovery'],
        default: 'pain'
    },
    urgency: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'emergency'],
        default: 'medium'
    },
    firstMentioned: { type: Date, default: Date.now },
    lastMentioned: { type: Date, default: Date.now },
    isResolved: { type: Boolean, default: false },
    resolution: { type: String }
}, { _id: false });

// Sentiment Schema
const SentimentSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    sentiment: { 
        type: String, 
        enum: ['positive', 'neutral', 'negative', 'frustrated', 'satisfied'],
        default: 'neutral'
    },
    confidence: { type: Number, min: 0, max: 1 },
    message: { type: String },
    factors: [{ type: String }]
}, { _id: false });

// Interaction Schema
const InteractionSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    type: { 
        type: String, 
        enum: ['message', 'appointment_request', 'contact_info', 'service_inquiry', 'complaint', 'compliment'],
        default: 'message'
    },
    userMessage: { type: String },
    botResponse: { type: String },
    responseTime: { type: Number }, // in milliseconds
    wasSuccessful: { type: Boolean },
    userSatisfaction: { type: Number, min: 1, max: 5 }
}, { _id: false });

const ConversationContextSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    businessId: { type: String, required: true },
    
    // User Information
    userInfo: {
        name: { type: String },
        phone: { type: String },
        email: { type: String },
        isContactInfoComplete: { type: Boolean, default: false }
    },
    
    // User Preferences
    userPreferences: UserPreferenceSchema,
    
    // Conversation Flow
    conversationFlow: ConversationFlowSchema,
    
    // Intent History
    intentHistory: [IntentHistorySchema],
    
    // Service Interests
    serviceInterests: [ServiceInterestSchema],
    
    // Patient Concerns
    concerns: [ConcernSchema],
    
    // Sentiment Tracking
    sentimentHistory: [SentimentSchema],
    
    // Interaction History
    interactions: [InteractionSchema],
    
    // Conversation State
    conversationState: {
        isFirstTimeUser: { type: Boolean, default: true },
        totalMessages: { type: Number, default: 0 },
        userMessages: { type: Number, default: 0 },
        botMessages: { type: Number, default: 0 },
        sessionDuration: { type: Number, default: 0 }, // in minutes
        lastInteraction: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
    },
    
    // Lead Information
    leadInfo: {
        isLead: { type: Boolean, default: false },
        leadScore: { type: Number, min: 0, max: 100, default: 0 },
        primaryInterest: { type: String },
        urgency: { 
            type: String, 
            enum: ['low', 'medium', 'high', 'emergency'],
            default: 'low'
        },
        appointmentRequested: { type: Boolean, default: false },
        contactInfoCollected: { type: Boolean, default: false }
    },
    
    // AI Context
    aiContext: {
        lastPrompt: { type: String },
        responseQuality: { type: Number, min: 1, max: 5 },
        businessContextUsed: { type: Boolean, default: false },
        serviceContextUsed: { type: Boolean, default: false },
        personalizationLevel: { type: Number, min: 0, max: 5, default: 0 }
    },
    
    // Error Tracking
    errors: [
        {
            timestamp: { type: Date, default: Date.now },
            error: { type: String },
            context: { type: String },
            resolved: { type: Boolean, default: false }
        }
    ]
    
}, { timestamps: true });

// Method to update conversation stage
ConversationContextSchema.methods.updateStage = function(newStage, subStage = null) {
    this.conversationFlow.stage = newStage;
    if (subStage) this.conversationFlow.subStage = subStage;
    this.conversationFlow.lastActivity = new Date();
    return this.save();
};

// Method to add intent to history
ConversationContextSchema.methods.addIntent = function(intent, userMessage, botResponse, responseType) {
    this.intentHistory.push({
        intent,
        userMessage,
        botResponse,
        responseType,
        timestamp: new Date()
    });
    return this.save();
};

// Method to update service interest
ConversationContextSchema.methods.updateServiceInterest = function(serviceName, interestLevel = 'medium') {
    const existingInterest = this.serviceInterests.find(interest => 
        interest.serviceName.toLowerCase() === serviceName.toLowerCase()
    );
    
    if (existingInterest) {
        existingInterest.interestLevel = interestLevel;
        existingInterest.lastMentioned = new Date();
        existingInterest.mentionCount += 1;
    } else {
        this.serviceInterests.push({
            serviceName,
            interestLevel,
            firstMentioned: new Date(),
            lastMentioned: new Date()
        });
    }
    return this.save();
};

// Method to add concern
ConversationContextSchema.methods.addConcern = function(concern, category = 'pain', urgency = 'medium') {
    const existingConcern = this.concerns.find(c => 
        c.concern.toLowerCase() === concern.toLowerCase()
    );
    
    if (existingConcern) {
        existingConcern.lastMentioned = new Date();
        if (urgency === 'emergency') existingConcern.urgency = urgency;
    } else {
        this.concerns.push({
            concern,
            category,
            urgency,
            firstMentioned: new Date(),
            lastMentioned: new Date()
        });
    }
    return this.save();
};

// Method to update sentiment
ConversationContextSchema.methods.updateSentiment = function(sentiment, message, confidence = 0.5) {
    this.sentimentHistory.push({
        sentiment,
        message,
        confidence,
        timestamp: new Date()
    });
    return this.save();
};

// Method to add interaction
ConversationContextSchema.methods.addInteraction = function(type, userMessage, botResponse, responseTime, wasSuccessful) {
    this.interactions.push({
        type,
        userMessage,
        botResponse,
        responseTime,
        wasSuccessful,
        timestamp: new Date()
    });
    
    this.conversationState.totalMessages += 1;
    this.conversationState.userMessages += 1;
    this.conversationState.lastInteraction = new Date();
    
    return this.save();
};

// Method to get conversation summary
ConversationContextSchema.methods.getConversationSummary = function() {
    const currentSentiment = this.sentimentHistory.length > 0 
        ? this.sentimentHistory[this.sentimentHistory.length - 1].sentiment 
        : 'neutral';
    
    const primaryInterest = this.serviceInterests.length > 0 
        ? this.serviceInterests.reduce((prev, current) => 
            prev.mentionCount > current.mentionCount ? prev : current
          ).serviceName 
        : null;
    
    const urgentConcerns = this.concerns.filter(concern => 
        concern.urgency === 'emergency' && !concern.isResolved
    );
    
    return {
        stage: this.conversationFlow.stage,
        currentSentiment,
        primaryInterest,
        urgentConcerns: urgentConcerns.length,
        totalMessages: this.conversationState.totalMessages,
        isLead: this.leadInfo.isLead,
        leadScore: this.leadInfo.leadScore,
        contactInfoComplete: this.userInfo.isContactInfoComplete
    };
};

// Method to get context for AI
ConversationContextSchema.methods.getAIContext = function() {
    return {
        userPreferences: this.userPreferences,
        conversationStage: this.conversationFlow.stage,
        serviceInterests: this.serviceInterests,
        concerns: this.concerns,
        recentIntents: this.intentHistory.slice(-5), // Last 5 intents
        currentSentiment: this.sentimentHistory.length > 0 
            ? this.sentimentHistory[this.sentimentHistory.length - 1] 
            : null,
        leadInfo: this.leadInfo,
        userInfo: this.userInfo
    };
};

// Static method to find active sessions
ConversationContextSchema.statics.findActiveSessions = function(businessId) {
    return this.find({
        businessId,
        'conversationState.isActive': true,
        'conversationState.lastInteraction': { 
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
    });
};

export default mongoose.model("ConversationContext", ConversationContextSchema); 