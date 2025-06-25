import mongoose from "mongoose";

// Cost Range Schema
const CostRangeSchema = new mongoose.Schema({
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' },
    notes: { type: String }
}, { _id: false });

// FAQ Schema
const FAQSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, enum: ['general', 'procedure', 'recovery', 'cost', 'risks'] }
}, { _id: false });

// Pre/Post Care Schema
const CareInstructionsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    instructions: [{ type: String }],
    duration: { type: String },
    importantNotes: [{ type: String }]
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
    businessId: { type: String, required: true, index: true }, // Indexing for faster lookups
    services: [
        {
            name: { type: String, required: true, trim: true },
            description: { type: String, trim: true },
            price: { type: String, trim: true },
            manualOverride: { type: Boolean, default: false },
            
            // Enhanced Service Details
            procedure: { type: String }, // Step-by-step procedure description
            duration: { type: String }, // Typical treatment duration
            recoveryTime: { type: String }, // Expected recovery period
            costRange: CostRangeSchema, // Price range object
            preCare: CareInstructionsSchema, // Pre-treatment instructions
            postCare: CareInstructionsSchema, // Post-treatment care instructions
            commonQuestions: [FAQSchema], // Array of FAQ objects
            relatedServices: [{ type: String }], // Array of related service names
            contraindications: [{ type: String }], // When service isn't recommended
            benefits: [{ type: String }], // Array of treatment benefits
            risks: [{ type: String }], // Potential risks or side effects
            alternatives: [{ type: String }], // Alternative treatment options
            technology: { type: String }, // Technology/equipment used
            anesthesia: { type: String }, // Anesthesia information
            followUp: { type: String }, // Follow-up requirements
            
            // Service Categories
            category: { 
                type: String, 
                enum: ['preventive', 'restorative', 'cosmetic', 'surgical', 'emergency', 'diagnostic'],
                default: 'preventive'
            },
            urgency: { 
                type: String, 
                enum: ['routine', 'urgent', 'emergency'],
                default: 'routine'
            },
            
            // Patient Information
            ageGroup: { 
                type: String, 
                enum: ['children', 'adults', 'seniors', 'all'],
                default: 'all'
            },
            insuranceCoverage: { type: String }, // Insurance coverage notes
            paymentPlans: { type: Boolean, default: false }, // Available payment plans
            
            // Service Status
            isActive: { type: Boolean, default: true },
            isFeatured: { type: Boolean, default: false },
            popularity: { type: Number, default: 0 }, // Popularity score
            rating: { type: Number, min: 0, max: 5, default: 0 }, // Average rating
            
            // SEO and Marketing
            keywords: [{ type: String }], // SEO keywords
            metaDescription: { type: String }, // Meta description for SEO
            beforeAfterImages: [{ type: String }], // Before/after image URLs
            testimonials: [{ type: String }] // Patient testimonials
        }
    ]
}, { timestamps: true }); // Automatically adds createdAt & updatedAt fields

// Method to get service by name
ServiceSchema.methods.getServiceByName = function(serviceName) {
    return this.services.find(service => 
        service.name.toLowerCase() === serviceName.toLowerCase()
    );
};

// Method to get services by category
ServiceSchema.methods.getServicesByCategory = function(category) {
    return this.services.filter(service => service.category === category);
};

// Method to get featured services
ServiceSchema.methods.getFeaturedServices = function() {
    return this.services.filter(service => service.isFeatured);
};

// Method to get service context for AI
ServiceSchema.methods.getServiceContext = function(serviceName) {
    const service = this.getServiceByName(serviceName);
    if (!service) return null;
    
    return {
        name: service.name,
        description: service.description,
        procedure: service.procedure,
        duration: service.duration,
        recoveryTime: service.recoveryTime,
        costRange: service.costRange,
        benefits: service.benefits,
        risks: service.risks,
        category: service.category,
        urgency: service.urgency,
        commonQuestions: service.commonQuestions,
        relatedServices: service.relatedServices
    };
};

// Method to get all services context for AI
ServiceSchema.methods.getAllServicesContext = function() {
    return this.services.map(service => ({
        name: service.name,
        description: service.description,
        category: service.category,
        urgency: service.urgency,
        isFeatured: service.isFeatured,
        benefits: service.benefits
    }));
};

// Static method to find services by business and category
ServiceSchema.statics.findByBusinessAndCategory = function(businessId, category) {
    return this.findOne({ businessId }).then(serviceDoc => {
        if (!serviceDoc) return [];
        return serviceDoc.getServicesByCategory(category);
    });
};

export default mongoose.model("Service", ServiceSchema);

