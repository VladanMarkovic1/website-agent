import mongoose from "mongoose";
import bcrypt from 'bcrypt'; // Import bcrypt

const BusinessSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    websiteUrl: { type: String, required: true },
    notificationEmail: { type: String }, // Add notification email field
    apiKeyHash: { type: String, select: false }, // Store hashed key, don't select by default
    // Add chatbot config fields later
    widgetConfig: {
      primaryColor: { type: String, default: '#3B82F6' }, // Example default blue
      position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
      welcomeMessage: { type: String, default: 'Hello! How can I help you today?' }
    }
}, { 
    strictPopulate: false, 
    timestamps: true // Add timestamps for tracking
});

// Method to compare API key (add this to the schema)
BusinessSchema.methods.compareApiKey = async function(candidateKey) {
    if (!this.apiKeyHash || !candidateKey) {
        return false;
    }
    return bcrypt.compare(candidateKey, this.apiKeyHash);
};

export default mongoose.model("Business", BusinessSchema);

