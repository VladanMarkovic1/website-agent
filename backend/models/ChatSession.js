import mongoose from 'mongoose';

// Define a schema for individual messages within a session
const messageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        enum: ['user', 'assistant', 'system'], 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    // Optional fields captured during processing
    type: String, 
    serviceContext: String,
    problemCategory: String
}, { _id: false }); // Don't create separate _id for subdocuments unless needed

const chatSessionSchema = new mongoose.Schema({
    // Use a custom session ID string provided by the client/frontend
    sessionId: { 
        type: String, 
        required: true, 
        unique: true, // Ensure session IDs are unique
        index: true     // Index for fast lookups
    },
    // Using String for businessId to match current codebase state
    businessId: { 
        type: String, 
        required: true, 
        index: true 
    }, 
    messages: [messageSchema], // Array of message subdocuments
    lastActivity: { 
        type: Date, 
        default: Date.now, 
        index: true // Index for efficient cleanup of old sessions
    },
    partialContactInfo: {
        name: { type: String, default: null },
        phone: { type: String, default: null },
        email: { type: String, default: null },
    },
    contactInfo: { // Store captured COMPLETE contact info (after lead save)
        name: String,
        phone: String,
        email: String,
    },
    serviceInterest: String, // Captured service interest
    isFirstMessage: { // Track if it's the initial interaction
        type: Boolean,
        default: true
    },
    problemDescription: String, // Captured initial problem
    createdAt: { // Track session creation time
        type: Date,
        default: Date.now,
        expires: '48h' // Automatically delete sessions after 48 hours of inactivity (TTL index)
                       // Adjust duration as needed. Requires lastActivity to be updated.
    }
}, { 
    timestamps: true // Automatically add createdAt and updatedAt
});

// TTL index on createdAt for automatic expiration (alternative to manual cleanup)
// chatSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 }); // 48 hours

// Index for cleanup based on lastActivity if not using TTL
// chatSessionSchema.index({ lastActivity: 1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession; 