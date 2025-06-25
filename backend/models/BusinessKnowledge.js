import mongoose from "mongoose";

// FAQ Schema
const FAQSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['general', 'appointments', 'insurance', 'payment', 'procedures', 'emergency', 'preparation'],
        default: 'general'
    },
    tags: [{ type: String }],
    priority: { type: Number, default: 1 }, // 1-5, higher is more important
    isActive: { type: Boolean, default: true }
}, { _id: false });

// Common Concern Schema
const CommonConcernSchema = new mongoose.Schema({
    concern: { type: String, required: true },
    description: { type: String },
    response: { type: String, required: true },
    relatedServices: [{ type: String }],
    urgency: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'emergency'],
        default: 'medium'
    },
    keywords: [{ type: String }],
    followUpQuestions: [{ type: String }]
}, { _id: false });

// Pre-Appointment Information Schema
const PreAppointmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    instructions: [{ type: String }],
    requiredDocuments: [{ type: String }],
    preparationSteps: [{ type: String }],
    whatToBring: [{ type: String }],
    whatNotToDo: [{ type: String }],
    duration: { type: String },
    specialNotes: { type: String }
}, { _id: false });

// Post-Treatment Care Schema
const PostTreatmentCareSchema = new mongoose.Schema({
    treatmentType: { type: String, required: true },
    immediateCare: [{ type: String }],
    recoveryPeriod: { type: String },
    careInstructions: [{ type: String }],
    painManagement: { type: String },
    dietRestrictions: [{ type: String }],
    activityRestrictions: [{ type: String }],
    followUpSchedule: { type: String },
    warningSigns: [{ type: String }],
    emergencyContact: { type: String }
}, { _id: false });

// Insurance Information Schema
const InsuranceInfoSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    coverageDetails: { type: String },
    acceptedPlans: [{ type: String }],
    copayInfo: { type: String },
    deductibleInfo: { type: String },
    preAuthorization: { type: Boolean, default: false },
    preAuthProcess: { type: String },
    claimProcess: { type: String },
    contactInfo: { type: String }
}, { _id: false });

// Payment Plan Schema
const PaymentPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    terms: { type: String },
    interestRate: { type: Number },
    downPayment: { type: String },
    monthlyPayment: { type: String },
    eligibility: { type: String },
    applicationProcess: { type: String }
}, { _id: false });

// Emergency Information Schema
const EmergencyInfoSchema = new mongoose.Schema({
    emergencyContact: { type: String, required: true },
    afterHoursContact: { type: String },
    emergencyProtocol: { type: String },
    urgentCareInstructions: { type: String },
    whenToSeekEmergency: [{ type: String }],
    emergencySymptoms: [{ type: String }],
    nearestHospital: { type: String },
    nearestUrgentCare: { type: String }
}, { _id: false });

// Patient Resource Schema
const PatientResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['document', 'video', 'article', 'form', 'guide'],
        default: 'document'
    },
    description: { type: String },
    url: { type: String },
    filePath: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true }
}, { _id: false });

const BusinessKnowledgeSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    
    // FAQ System
    faqs: [FAQSchema],
    
    // Common Patient Concerns
    commonConcerns: [CommonConcernSchema],
    
    // Pre-Appointment Information
    preAppointmentInfo: [PreAppointmentSchema],
    
    // Post-Treatment Care
    postTreatmentCare: [PostTreatmentCareSchema],
    
    // Insurance Information
    insuranceInfo: [InsuranceInfoSchema],
    
    // Payment Plans
    paymentPlans: [PaymentPlanSchema],
    
    // Emergency Information
    emergencyInfo: EmergencyInfoSchema,
    
    // Patient Resources
    patientResources: [PatientResourceSchema],
    
    // General Information
    generalInfo: {
        aboutUs: { type: String },
        mission: { type: String },
        values: [{ type: String }],
        policies: [{ type: String }],
        accessibility: { type: String },
        languages: [{ type: String }],
        specialAccommodations: [{ type: String }]
    },
    
    // Contact Information
    contactInfo: {
        mainPhone: { type: String },
        emergencyPhone: { type: String },
        email: { type: String },
        address: { type: String },
        directions: { type: String },
        parking: { type: String },
        publicTransport: { type: String }
    },
    
    // Operating Information
    operatingInfo: {
        hours: { type: String },
        appointmentScheduling: { type: String },
        cancellationPolicy: { type: String },
        latePolicy: { type: String },
        noShowPolicy: { type: String }
    }
    
}, { timestamps: true });

// Method to get FAQ by category
BusinessKnowledgeSchema.methods.getFAQsByCategory = function(category) {
    return this.faqs.filter(faq => faq.category === category && faq.isActive);
};

// Method to get common concerns by urgency
BusinessKnowledgeSchema.methods.getConcernsByUrgency = function(urgency) {
    return this.commonConcerns.filter(concern => concern.urgency === urgency);
};

// Method to get pre-appointment info by title
BusinessKnowledgeSchema.methods.getPreAppointmentInfo = function(title) {
    return this.preAppointmentInfo.find(info => info.title === title);
};

// Method to get post-treatment care by treatment type
BusinessKnowledgeSchema.methods.getPostTreatmentCare = function(treatmentType) {
    return this.postTreatmentCare.find(care => care.treatmentType === treatmentType);
};

// Method to get insurance info by provider
BusinessKnowledgeSchema.methods.getInsuranceInfo = function(provider) {
    return this.insuranceInfo.find(insurance => insurance.provider === provider);
};

// Method to get knowledge context for AI
BusinessKnowledgeSchema.methods.getKnowledgeContext = function() {
    return {
        faqs: this.faqs.filter(faq => faq.isActive),
        commonConcerns: this.commonConcerns,
        preAppointmentInfo: this.preAppointmentInfo,
        postTreatmentCare: this.postTreatmentCare,
        insuranceInfo: this.insuranceInfo,
        paymentPlans: this.paymentPlans,
        emergencyInfo: this.emergencyInfo,
        generalInfo: this.generalInfo,
        contactInfo: this.contactInfo,
        operatingInfo: this.operatingInfo
    };
};

// Method to search knowledge base
BusinessKnowledgeSchema.methods.searchKnowledge = function(query) {
    const searchTerm = query.toLowerCase();
    const results = {
        faqs: [],
        concerns: [],
        resources: []
    };
    
    // Search FAQs
    this.faqs.forEach(faq => {
        if (faq.isActive && 
            (faq.question.toLowerCase().includes(searchTerm) || 
             faq.answer.toLowerCase().includes(searchTerm) ||
             faq.tags.some(tag => tag.toLowerCase().includes(searchTerm)))) {
            results.faqs.push(faq);
        }
    });
    
    // Search common concerns
    this.commonConcerns.forEach(concern => {
        if (concern.concern.toLowerCase().includes(searchTerm) ||
            concern.description.toLowerCase().includes(searchTerm) ||
            concern.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) {
            results.concerns.push(concern);
        }
    });
    
    // Search patient resources
    this.patientResources.forEach(resource => {
        if (resource.isActive &&
            (resource.title.toLowerCase().includes(searchTerm) ||
             resource.description.toLowerCase().includes(searchTerm) ||
             resource.tags.some(tag => tag.toLowerCase().includes(searchTerm)))) {
            results.resources.push(resource);
        }
    });
    
    return results;
};

export default mongoose.model("BusinessKnowledge", BusinessKnowledgeSchema); 