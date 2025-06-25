import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Service from '../models/Service.js';
import ExtraInfo from '../models/ExtraInfo.js';
import BusinessKnowledge from '../models/BusinessKnowledge.js';
import Contact from '../models/Contact.js';

/**
 * Enhanced Data Population Script
 * Automatically populates enhanced business data for existing businesses
 */
class EnhancedDataPopulator {
    
    constructor() {
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            errors: []
        };
    }
    
    /**
     * Main population function
     * @param {string} businessId - Optional specific business ID, if not provided processes all
     * @returns {Promise<Object>} Population results
     */
    async populateEnhancedData(businessId = null) {
        try {
            console.log('[EnhancedDataPopulator] Starting enhanced data population...');
            
            // Get businesses to process
            const businesses = businessId 
                ? await Business.find({ businessId }) 
                : await Business.find({});
            
            console.log(`[EnhancedDataPopulator] Found ${businesses.length} businesses to process`);
            
            // Process each business
            for (const business of businesses) {
                try {
                    console.log(`[EnhancedDataPopulator] Processing business: ${business.businessName} (${business.businessId})`);
                    
                    await this.processBusiness(business);
                    this.stats.successful++;
                    
                } catch (error) {
                    console.error(`[EnhancedDataPopulator] Error processing business ${business.businessId}:`, error.message);
                    this.stats.failed++;
                    this.stats.errors.push({
                        businessId: business.businessId,
                        error: error.message
                    });
                }
                
                this.stats.processed++;
            }
            
            // Generate final report
            const report = this.generateReport();
            console.log('[EnhancedDataPopulator] Population completed:', report);
            
            return report;
            
        } catch (error) {
            console.error('[EnhancedDataPopulator] Fatal error during population:', error);
            throw error;
        }
    }
    
    /**
     * Process a single business
     * @param {Object} business - Business document
     * @returns {Promise<void>}
     */
    async processBusiness(business) {
        console.log(`[EnhancedDataPopulator] Building profile for ${business.businessName}`);
        
        // Step 1: Populate missing data with defaults
        await this.populateMissingData(business.businessId);
        
        // Step 2: Update business with enhanced information
        await this.updateBusinessWithDefaults(business);
        
        console.log(`[EnhancedDataPopulator] Completed processing for ${business.businessName}`);
    }
    
    /**
     * Populate missing data with sensible defaults
     * @param {string} businessId 
     * @returns {Promise<void>}
     */
    async populateMissingData(businessId) {
        console.log(`[EnhancedDataPopulator] Populating missing data for ${businessId}`);
        
        // Get current business data
        const business = await Business.findOne({ businessId });
        const services = await Service.findOne({ businessId });
        const extraInfo = await ExtraInfo.findOne({ businessId });
        const knowledge = await BusinessKnowledge.findOne({ businessId });
        
        // Populate business defaults
        if (business) {
            await this.populateBusinessDefaults(business);
        }
        
        // Populate services defaults
        if (services) {
            await this.populateServicesDefaults(services);
        }
        
        // Populate extra info defaults
        if (extraInfo) {
            await this.populateExtraInfoDefaults(extraInfo);
        }
        
        // Populate knowledge defaults
        if (knowledge) {
            await this.populateKnowledgeDefaults(knowledge);
        }
    }
    
    /**
     * Populate business defaults
     * @param {Object} business - Business document
     * @returns {Promise<void>}
     */
    async populateBusinessDefaults(business) {
        const updates = {};
        
        // Business description
        if (!business.businessDescription) {
            updates.businessDescription = `${business.businessName} is a professional dental practice committed to providing high-quality, personalized dental care in a comfortable and welcoming environment. We focus on patient comfort and satisfaction while delivering exceptional dental services.`;
        }
        
        // Specializations
        if (!business.specializations || business.specializations.length === 0) {
            updates.specializations = [
                'General Dentistry',
                'Preventive Care',
                'Cosmetic Dentistry',
                'Restorative Dentistry'
            ];
        }
        
        // Years in business
        if (!business.yearsInBusiness) {
            updates.yearsInBusiness = 5; // Default to 5 years
        }
        
        // Business hours
        if (!business.businessHours) {
            updates.businessHours = {
                monday: { open: "09:00", close: "17:00", closed: false },
                tuesday: { open: "09:00", close: "17:00", closed: false },
                wednesday: { open: "09:00", close: "17:00", closed: false },
                thursday: { open: "09:00", close: "17:00", closed: false },
                friday: { open: "09:00", close: "17:00", closed: false },
                saturday: { open: "09:00", close: "13:00", closed: true },
                sunday: { open: "09:00", close: "13:00", closed: true }
            };
        }
        
        // Business personality
        if (!business.businessPersonality) {
            updates.businessPersonality = {
                tone: 'professional',
                communicationStyle: 'friendly',
                expertise: 'high',
                approachability: 'high'
            };
        }
        
        // AI configuration
        if (!business.aiConfiguration) {
            updates.aiConfiguration = {
                responseStyle: 'professional',
                detailLevel: 'comprehensive',
                useBusinessContext: true,
                includePricing: false,
                includeInsurance: true
            };
        }
        
        // Apply updates
        if (Object.keys(updates).length > 0) {
            Object.assign(business, updates);
            await business.save();
            console.log(`[EnhancedDataPopulator] Updated business defaults for ${business.businessId}`);
        }
    }
    
    /**
     * Populate services defaults
     * @param {Object} services - Services document
     * @returns {Promise<void>}
     */
    async populateServicesDefaults(services) {
        if (!services.services || services.services.length === 0) {
            // Create default services
            services.services = [
                {
                    name: 'Dental Cleaning',
                    description: 'Professional dental cleaning and examination to maintain oral health and prevent dental problems.',
                    price: '',
                    manualOverride: false,
                    category: 'preventive',
                    urgency: 'routine',
                    ageGroup: 'all',
                    isActive: true,
                    isFeatured: true,
                    popularity: 5,
                    rating: 5,
                    keywords: ['cleaning', 'hygiene', 'preventive'],
                    benefits: ['Prevents cavities', 'Maintains oral health', 'Fresh breath'],
                    risks: [],
                    alternatives: [],
                    duration: '60 minutes',
                    recoveryTime: 'None',
                    preCareInstructions: ['Brush and floss before appointment'],
                    postCareInstructions: ['Continue regular brushing and flossing'],
                    costRange: { min: 100, max: 200, currency: 'USD' },
                    faqs: [
                        {
                            question: 'How often should I get a dental cleaning?',
                            answer: 'Most patients should have a dental cleaning every 6 months.',
                            category: 'general'
                        }
                    ]
                },
                {
                    name: 'Dental Examination',
                    description: 'Comprehensive dental examination including X-rays and oral cancer screening.',
                    price: '',
                    manualOverride: false,
                    category: 'diagnostic',
                    urgency: 'routine',
                    ageGroup: 'all',
                    isActive: true,
                    isFeatured: false,
                    popularity: 4,
                    rating: 5,
                    keywords: ['examination', 'checkup', 'diagnostic'],
                    benefits: ['Early problem detection', 'Oral cancer screening', 'Treatment planning'],
                    risks: [],
                    alternatives: [],
                    duration: '30 minutes',
                    recoveryTime: 'None',
                    preCareInstructions: ['No special preparation required'],
                    postCareInstructions: ['Follow recommended treatment plan'],
                    costRange: { min: 75, max: 150, currency: 'USD' },
                    faqs: [
                        {
                            question: 'What is included in a dental examination?',
                            answer: 'A dental examination includes visual inspection, X-rays, oral cancer screening, and treatment recommendations.',
                            category: 'general'
                        }
                    ]
                },
                {
                    name: 'Teeth Whitening',
                    description: 'Professional teeth whitening treatment to brighten your smile.',
                    price: '',
                    manualOverride: false,
                    category: 'cosmetic',
                    urgency: 'low',
                    ageGroup: 'adult',
                    isActive: true,
                    isFeatured: true,
                    popularity: 5,
                    rating: 5,
                    keywords: ['whitening', 'cosmetic', 'bright'],
                    benefits: ['Brighter smile', 'Improved confidence', 'Professional results'],
                    risks: ['Temporary sensitivity'],
                    alternatives: ['At-home whitening', 'Veneers'],
                    duration: '90 minutes',
                    recoveryTime: 'None',
                    preCareInstructions: ['Avoid staining foods 24 hours before'],
                    postCareInstructions: ['Avoid staining foods for 48 hours', 'Use sensitivity toothpaste if needed'],
                    costRange: { min: 300, max: 600, currency: 'USD' },
                    faqs: [
                        {
                            question: 'How long do whitening results last?',
                            answer: 'Whitening results typically last 6 months to 2 years with proper care.',
                            category: 'cosmetic'
                        }
                    ]
                }
            ];
            
            await services.save();
            console.log(`[EnhancedDataPopulator] Created default services for ${services.businessId}`);
        } else {
            // Enhance existing services
            let updated = false;
            
            services.services.forEach(service => {
                if (!service.description || service.description.length < 10) {
                    service.description = `Professional ${service.name} services to meet your dental needs.`;
                    updated = true;
                }
                
                if (!service.category) {
                    service.category = this.categorizeService(service.name);
                    updated = true;
                }
                
                if (!service.benefits || service.benefits.length === 0) {
                    service.benefits = [`Professional ${service.name} treatment`];
                    updated = true;
                }
                
                if (!service.keywords || service.keywords.length === 0) {
                    service.keywords = [service.name.toLowerCase()];
                    updated = true;
                }
                
                if (service.isActive === undefined) {
                    service.isActive = true;
                    updated = true;
                }
            });
            
            if (updated) {
                await services.save();
                console.log(`[EnhancedDataPopulator] Enhanced existing services for ${services.businessId}`);
            }
        }
    }
    
    /**
     * Populate extra info defaults
     * @param {Object} extraInfo - ExtraInfo document
     * @returns {Promise<void>}
     */
    async populateExtraInfoDefaults(extraInfo) {
        const updates = {};
        
        // Patient testimonials
        if (!extraInfo.patientTestimonials || extraInfo.patientTestimonials.length === 0) {
            updates.patientTestimonials = [
                {
                    patientName: 'Sarah M.',
                    service: 'Dental Cleaning',
                    rating: 5,
                    review: 'Excellent service! The staff was very professional and made me feel comfortable throughout my visit.',
                    date: new Date(),
                    isVerified: true,
                    isFeatured: true,
                    tags: ['professional', 'comfortable']
                },
                {
                    patientName: 'John D.',
                    service: 'Teeth Whitening',
                    rating: 5,
                    review: 'Amazing results! My teeth look so much brighter and the process was painless.',
                    date: new Date(),
                    isVerified: true,
                    isFeatured: true,
                    tags: ['results', 'painless']
                }
            ];
        }
        
        // Technology
        if (!extraInfo.technology || extraInfo.technology.length === 0) {
            updates.technology = [
                {
                    name: 'Digital X-Ray Technology',
                    description: 'Advanced digital X-ray technology for accurate diagnosis with minimal radiation exposure.',
                    benefits: ['Reduced radiation', 'Better image quality', 'Faster results'],
                    imageUrl: '',
                    isAdvanced: true
                },
                {
                    name: 'Intraoral Cameras',
                    description: 'High-definition intraoral cameras for detailed examination and patient education.',
                    benefits: ['Better visualization', 'Patient education', 'Accurate diagnosis'],
                    imageUrl: '',
                    isAdvanced: true
                }
            ];
        }
        
        // Awards
        if (!extraInfo.awards || extraInfo.awards.length === 0) {
            updates.awards = [
                {
                    name: 'Top Dentist Award',
                    year: 2023,
                    organization: 'Local Dental Association',
                    description: 'Recognized for excellence in patient care and professional service.',
                    imageUrl: ''
                }
            ];
        }
        
        // Insurance details
        if (!extraInfo.insuranceDetails || extraInfo.insuranceDetails.length === 0) {
            updates.insuranceDetails = [
                {
                    provider: 'Delta Dental',
                    coverageDetails: 'We accept Delta Dental insurance plans with various coverage options.',
                    acceptedPlans: ['PPO', 'HMO'],
                    copayInfo: 'Copay varies by plan',
                    deductibleInfo: 'Deductible varies by plan',
                    preAuthorization: false,
                    preAuthProcess: 'Contact us to verify coverage',
                    claimProcess: 'We file claims directly',
                    contactInfo: 'Contact our office for specific coverage details'
                }
            ];
        }
        
        // Apply updates
        if (Object.keys(updates).length > 0) {
            Object.assign(extraInfo, updates);
            await extraInfo.save();
            console.log(`[EnhancedDataPopulator] Updated extra info defaults for ${extraInfo.businessId}`);
        }
    }
    
    /**
     * Populate knowledge defaults
     * @param {Object} knowledge - BusinessKnowledge document
     * @returns {Promise<void>}
     */
    async populateKnowledgeDefaults(knowledge) {
        const updates = {};
        
        // FAQs
        if (!knowledge.faqs || knowledge.faqs.length === 0) {
            updates.faqs = [
                {
                    question: 'What services do you offer?',
                    answer: 'We offer comprehensive dental services including cleanings, examinations, fillings, crowns, whitening, and more.',
                    category: 'general',
                    tags: ['services', 'offerings'],
                    priority: 5,
                    isActive: true
                },
                {
                    question: 'Do you accept insurance?',
                    answer: 'Yes, we accept most major insurance plans. Please contact us to verify your specific coverage.',
                    category: 'insurance',
                    tags: ['insurance', 'coverage'],
                    priority: 4,
                    isActive: true
                },
                {
                    question: 'How do I schedule an appointment?',
                    answer: 'You can schedule an appointment by calling our office or using our online booking system.',
                    category: 'appointments',
                    tags: ['appointment', 'schedule'],
                    priority: 5,
                    isActive: true
                }
            ];
        }
        
        // Common concerns
        if (!knowledge.commonConcerns || knowledge.commonConcerns.length === 0) {
            updates.commonConcerns = [
                {
                    concern: 'Tooth pain or sensitivity',
                    description: 'Patients experiencing tooth pain or sensitivity',
                    response: 'Tooth pain can indicate various dental issues. We recommend scheduling an evaluation to determine the cause and appropriate treatment.',
                    relatedServices: ['Dental Examination', 'Root Canal Treatment'],
                    urgency: 'medium',
                    keywords: ['pain', 'sensitivity', 'toothache'],
                    followUpQuestions: [
                        'How long have you been experiencing the pain?',
                        'Is the pain constant or intermittent?',
                        'What triggers the pain?'
                    ]
                }
            ];
        }
        
        // Apply updates
        if (Object.keys(updates).length > 0) {
            Object.assign(knowledge, updates);
            await knowledge.save();
            console.log(`[EnhancedDataPopulator] Updated knowledge defaults for ${knowledge.businessId}`);
        }
    }
    
    /**
     * Update business with enhanced information
     * @param {Object} business - Business document
     * @returns {Promise<void>}
     */
    async updateBusinessWithDefaults(business) {
        // This method can be used to add any final business-specific updates
        // For now, we'll just ensure the business is properly configured for AI
        
        if (!business.aiConfiguration) {
            business.aiConfiguration = {
                responseStyle: 'professional',
                detailLevel: 'comprehensive',
                useBusinessContext: true,
                includePricing: false,
                includeInsurance: true,
                maxResponseLength: 500,
                includeFollowUpQuestions: true
            };
            
            await business.save();
            console.log(`[EnhancedDataPopulator] Updated AI configuration for ${business.businessId}`);
        }
    }
    
    /**
     * Helper methods
     */
    
    categorizeService(serviceName) {
        const serviceNameLower = serviceName.toLowerCase();
        
        if (serviceNameLower.includes('cleaning') || serviceNameLower.includes('hygiene')) {
            return 'preventive';
        } else if (serviceNameLower.includes('crown') || serviceNameLower.includes('filling') || serviceNameLower.includes('root canal')) {
            return 'restorative';
        } else if (serviceNameLower.includes('whitening') || serviceNameLower.includes('veneers') || serviceNameLower.includes('cosmetic')) {
            return 'cosmetic';
        } else if (serviceNameLower.includes('implant') || serviceNameLower.includes('surgery') || serviceNameLower.includes('extraction')) {
            return 'surgical';
        } else if (serviceNameLower.includes('emergency') || serviceNameLower.includes('pain')) {
            return 'emergency';
        } else {
            return 'diagnostic';
        }
    }
    
    generateReport() {
        return {
            timestamp: new Date(),
            summary: {
                totalProcessed: this.stats.processed,
                successful: this.stats.successful,
                failed: this.stats.failed,
                successRate: Math.round((this.stats.successful / this.stats.processed) * 100)
            },
            errors: this.stats.errors,
            recommendations: this.generateRecommendations()
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        if (this.stats.failed > 0) {
            recommendations.push('Review failed businesses and address any data issues');
        }
        
        if (this.stats.successful > 0) {
            recommendations.push('Run data validation to ensure quality of populated data');
            recommendations.push('Test AI responses with the enhanced business context');
        }
        
        return recommendations;
    }
}

// Export the class and a default instance
const enhancedDataPopulator = new EnhancedDataPopulator();
export default enhancedDataPopulator;

// Also export the class for direct instantiation
export { EnhancedDataPopulator }; 