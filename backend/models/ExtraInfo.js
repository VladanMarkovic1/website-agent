import mongoose from "mongoose";

// Featured Service Schema
const FeaturedServiceSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    displayName: { type: String, required: true }
}, { _id: false });

// Patient Testimonial Schema
const TestimonialSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    service: { type: String },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String }]
}, { _id: false });

// Before/After Photo Schema
const BeforeAfterPhotoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    service: { type: String, required: true },
    beforeImage: { type: String, required: true },
    afterImage: { type: String, required: true },
    description: { type: String },
    treatmentDetails: { type: String },
    duration: { type: String },
    isFeatured: { type: Boolean, default: false },
    consent: { type: Boolean, default: true }
}, { _id: false });

// Technology Schema
const TechnologySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    benefits: [{ type: String }],
    imageUrl: { type: String },
    isAdvanced: { type: Boolean, default: false }
}, { _id: false });

// Safety Protocol Schema
const SafetyProtocolSchema = new mongoose.Schema({
    protocol: { type: String, required: true },
    description: { type: String },
    implementation: { type: String },
    lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

// Accessibility Feature Schema
const AccessibilityFeatureSchema = new mongoose.Schema({
    feature: { type: String, required: true },
    description: { type: String },
    adaCompliant: { type: Boolean, default: false }
}, { _id: false });

// Special Accommodation Schema
const SpecialAccommodationSchema = new mongoose.Schema({
    accommodation: { type: String, required: true },
    description: { type: String },
    requestProcess: { type: String }
}, { _id: false });

const ExtraInfoSchema = new mongoose.Schema({
    businessId: { type: String, required: true },
    
    // Existing fields
    testimonials: [{ type: String }],
    faqs: [
        {
            question: { type: String },
            answer: { type: String }
        }
    ],
    operatingHours: { type: String },
    availableDays: [{ type: String }],
    availableTimes: [{ type: String }],
    insuranceOptions: [{ type: String }],
    featuredServices: [FeaturedServiceSchema],
    
    // Enhanced fields
    patientTestimonials: [TestimonialSchema],
    beforeAfterPhotos: [BeforeAfterPhotoSchema],
    technology: [TechnologySchema],
    safetyProtocols: [SafetyProtocolSchema],
    accessibility: [AccessibilityFeatureSchema],
    languages: [{ type: String }],
    specialAccommodations: [SpecialAccommodationSchema],
    
    // Awards and Recognition
    awards: [
        {
            name: { type: String, required: true },
            year: { type: Number },
            organization: { type: String },
            description: { type: String },
            imageUrl: { type: String }
        }
    ],
    
    // Certifications and Memberships
    certifications: [
        {
            name: { type: String, required: true },
            issuingOrganization: { type: String },
            dateObtained: { type: Date },
            expiryDate: { type: Date },
            description: { type: String }
        }
    ],
    
    // Community Involvement
    communityInvolvement: [
        {
            activity: { type: String, required: true },
            description: { type: String },
            year: { type: Number },
            impact: { type: String }
        }
    ],
    
    // Environmental and Sustainability
    environmentalPractices: [
        {
            practice: { type: String, required: true },
            description: { type: String },
            impact: { type: String }
        }
    ],
    
    // Patient Education
    patientEducation: [
        {
            title: { type: String, required: true },
            type: { 
                type: String, 
                enum: ['article', 'video', 'infographic', 'guide', 'brochure'],
                default: 'article'
            },
            description: { type: String },
            url: { type: String },
            tags: [{ type: String }],
            isActive: { type: Boolean, default: true }
        }
    ],
    
    // Office Amenities
    officeAmenities: [
        {
            amenity: { type: String, required: true },
            description: { type: String },
            isAvailable: { type: Boolean, default: true }
        }
    ],
    
    // Payment and Insurance Details
    paymentMethods: [
        {
            method: { type: String, required: true },
            description: { type: String },
            isAccepted: { type: Boolean, default: true }
        }
    ],
    
    insuranceDetails: [
        {
            provider: { type: String, required: true },
            plans: [{ type: String }],
            coverageDetails: { type: String },
            contactInfo: { type: String }
        }
    ],
    
    // Emergency Information
    emergencyInfo: {
        emergencyContact: { type: String },
        afterHoursContact: { type: String },
        emergencyProtocol: { type: String },
        nearestHospital: { type: String },
        nearestUrgentCare: { type: String }
    },
    
    // Social Media and Online Presence
    socialMedia: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
        youtube: { type: String },
        website: { type: String }
    },
    
    // SEO and Marketing
    seoInfo: {
        keywords: [{ type: String }],
        metaDescription: { type: String },
        googleMyBusiness: { type: String },
        yelpUrl: { type: String },
        healthgradesUrl: { type: String }
    }
    
}, { timestamps: true });

// Method to get featured testimonials
ExtraInfoSchema.methods.getFeaturedTestimonials = function() {
    return this.patientTestimonials.filter(testimonial => testimonial.isFeatured);
};

// Method to get testimonials by service
ExtraInfoSchema.methods.getTestimonialsByService = function(service) {
    return this.patientTestimonials.filter(testimonial => 
        testimonial.service && testimonial.service.toLowerCase() === service.toLowerCase()
    );
};

// Method to get before/after photos by service
ExtraInfoSchema.methods.getBeforeAfterPhotosByService = function(service) {
    return this.beforeAfterPhotos.filter(photo => 
        photo.service.toLowerCase() === service.toLowerCase()
    );
};

// Method to get advanced technology
ExtraInfoSchema.methods.getAdvancedTechnology = function() {
    return this.technology.filter(tech => tech.isAdvanced);
};

// Method to get accessibility features
ExtraInfoSchema.methods.getAccessibilityFeatures = function() {
    return this.accessibility.filter(feature => feature.adaCompliant);
};

// Method to get active patient education materials
ExtraInfoSchema.methods.getActivePatientEducation = function() {
    return this.patientEducation.filter(education => education.isActive);
};

// Method to get accepted payment methods
ExtraInfoSchema.methods.getAcceptedPaymentMethods = function() {
    return this.paymentMethods.filter(method => method.isAccepted);
};

// Method to get available amenities
ExtraInfoSchema.methods.getAvailableAmenities = function() {
    return this.officeAmenities.filter(amenity => amenity.isAvailable);
};

// Method to get extra info context for AI
ExtraInfoSchema.methods.getExtraInfoContext = function() {
    return {
        testimonials: this.getFeaturedTestimonials(),
        beforeAfterPhotos: this.beforeAfterPhotos.filter(photo => photo.isFeatured),
        technology: this.getAdvancedTechnology(),
        safetyProtocols: this.safetyProtocols,
        accessibility: this.getAccessibilityFeatures(),
        languages: this.languages,
        specialAccommodations: this.specialAccommodations,
        awards: this.awards,
        certifications: this.certifications,
        communityInvolvement: this.communityInvolvement,
        environmentalPractices: this.environmentalPractices,
        patientEducation: this.getActivePatientEducation(),
        officeAmenities: this.getAvailableAmenities(),
        paymentMethods: this.getAcceptedPaymentMethods(),
        insuranceDetails: this.insuranceDetails,
        emergencyInfo: this.emergencyInfo,
        socialMedia: this.socialMedia
    };
};

export default mongoose.model("ExtraInfo", ExtraInfoSchema);
