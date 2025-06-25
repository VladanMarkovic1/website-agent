import mongoose from "mongoose";
import bcrypt from 'bcrypt'; // Import bcrypt

// Team Member Schema
const TeamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    title: { type: String },
    education: { type: String },
    experience: { type: String },
    specializations: [{ type: String }],
    languages: [{ type: String }],
    bio: { type: String },
    imageUrl: { type: String }
}, { _id: false });

// Business Hours Schema
const BusinessHoursSchema = new mongoose.Schema({
    monday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        closed: { type: Boolean, default: false }
    },
    tuesday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        closed: { type: Boolean, default: false }
    },
    wednesday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        closed: { type: Boolean, default: false }
    },
    thursday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        closed: { type: Boolean, default: false }
    },
    friday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "17:00" },
        closed: { type: Boolean, default: false }
    },
    saturday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "13:00" },
        closed: { type: Boolean, default: true }
    },
    sunday: { 
        open: { type: String, default: "09:00" },
        close: { type: String, default: "13:00" },
        closed: { type: Boolean, default: true }
    }
}, { _id: false });

// Location Details Schema
const LocationDetailsSchema = new mongoose.Schema({
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    parking: { type: String },
    accessibility: { type: String },
    publicTransport: { type: String },
    landmarks: { type: String }
}, { _id: false });

const BusinessSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    websiteUrl: { type: String },
    notificationEmail: { type: String },
    phone: { type: String },
    email: { type: String },
    apiKeyHash: { type: String, select: false },
    
    // Enhanced Business Profile Fields
    businessDescription: { type: String },
    mission: { type: String },
    vision: { type: String },
    specializations: [{ type: String }],
    yearsInBusiness: { type: Number },
    certifications: [{ type: String }],
    awards: [{ type: String }],
    teamMembers: [TeamMemberSchema],
    insurancePartners: [{ type: String }],
    paymentOptions: [{ type: String }],
    emergencyProtocol: { type: String },
    locationDetails: LocationDetailsSchema,
    businessHours: BusinessHoursSchema,
    timezone: { type: String, default: "America/New_York" },
    
    // Business Personality & Tone
    businessTone: { 
        type: String, 
        enum: ['professional', 'friendly', 'casual', 'formal', 'caring'],
        default: 'professional'
    },
    communicationStyle: { 
        type: String, 
        enum: ['direct', 'empathetic', 'educational', 'conversational'],
        default: 'empathetic'
    },
    
    // Chatbot Configuration
    widgetConfig: {
        primaryColor: { type: String, default: '#3B82F6' },
        position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
        welcomeMessage: { type: String, default: 'Hello! How can I help you today?' },
        aiPersonality: { type: String, default: 'friendly and professional' },
        responseStyle: { type: String, default: 'helpful and informative' }
    },
    
    // AI Configuration
    aiConfig: {
        model: { type: String, default: 'gpt-4' },
        temperature: { type: Number, default: 0.7, min: 0, max: 2 },
        maxTokens: { type: Number, default: 300 },
        includeBusinessContext: { type: Boolean, default: true },
        includeServiceDetails: { type: Boolean, default: true },
        includeTeamInfo: { type: Boolean, default: true },
        includeTestimonials: { type: Boolean, default: true }
    }
}, { 
    strictPopulate: false, 
    timestamps: true
});

// Method to compare API key
BusinessSchema.methods.compareApiKey = async function(candidateKey) {
    if (!this.apiKeyHash || !candidateKey) {
        return false;
    }
    return bcrypt.compare(candidateKey, this.apiKeyHash);
};

// Method to get formatted business hours
BusinessSchema.methods.getFormattedHours = function() {
    if (!this.businessHours) return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return days.map((day, index) => {
        const hours = this.businessHours[day];
        if (hours.closed) {
            return `${dayNames[index]}: Closed`;
        }
        return `${dayNames[index]}: ${hours.open} - ${hours.close}`;
    }).join('\n');
};

// Method to get business context for AI
BusinessSchema.methods.getBusinessContext = function() {
    const ctx = {
        name: this.businessName,
        description: this.businessDescription,
        specializations: this.specializations,
        yearsInBusiness: this.yearsInBusiness,
        teamMembers: this.teamMembers,
        tone: this.businessTone,
        communicationStyle: this.communicationStyle,
        hours: this.getFormattedHours(),
        location: this.locationDetails
    };
    return ctx;
};

export default mongoose.model("Business", BusinessSchema);

