import Business from '../models/Business.js';
import Service from '../models/Service.js';
import ExtraInfo from '../models/ExtraInfo.js';
import BusinessKnowledge from '../models/BusinessKnowledge.js';
import ConversationContext from '../models/ConversationContext.js';
import Contact from '../models/Contact.js';
import util from 'util';

// NOTE: All business profile data (business hours, location, etc.) comes ONLY from the Business model. Do not use PhoneSettings, ExtraInfo, or any other model for these fields.

/**
 * Business Context Builder Service
 * Builds comprehensive business context for AI responses using real client data
 */
class BusinessContextBuilder {
    
    /**
     * Build comprehensive business context for AI responses
     * @param {string} businessId - Business identifier
     * @param {string} sessionId - Session identifier
     * @param {Object} userMessage - Current user message
     * @returns {Promise<Object>} Comprehensive business context
     */
    async buildBusinessContext(businessId, sessionId, userMessage) {
        try {
            console.log(`[BusinessContextBuilder] Building context for business: ${businessId}, session: ${sessionId}`);
            
            // Get all business data
            const business = await Business.findOne({ businessId });
            // NOTE: Only fetch services, knowledge, contact, etc. for non-profile data
            // All business profile data (hours, location, etc.) comes ONLY from Business model
            if (!business) {
                throw new Error(`Business not found: ${businessId}`);
            }
            
            // After fetching business:
            console.log('[LOG][businessContextBuilder] Raw business doc:', util.inspect(business, { depth: 5 }));
            
            // Build context using ONLY Business model for profile fields
            const context = {
                business: {
                    name: business.businessName,
                    description: business.businessDescription,
                    mission: business.mission,
                    vision: business.vision,
                    specializations: business.specializations,
                    yearsInBusiness: business.yearsInBusiness,
                    teamMembers: business.teamMembers,
                    businessHours: business.businessHours,
                    locationDetails: business.locationDetails,
                    certifications: business.certifications,
                    awards: business.awards,
                    insurancePartners: business.insurancePartners,
                    paymentOptions: business.paymentOptions,
                    emergencyProtocol: business.emergencyProtocol,
                    businessTone: business.businessTone,
                    communicationStyle: business.communicationStyle,
                    timezone: business.timezone,
                    websiteUrl: business.websiteUrl
                }
                // Add other context fields (services, knowledge, etc.) as needed, but NOT profile data
            };
            
            // Add dynamic context based on user message
            context.dynamicContext = await this.buildDynamicContext(context, userMessage);
            
            // Before returning context:
            console.log('[LOG][businessContextBuilder] Final business context:', util.inspect(context, { depth: 5 }));
            
            console.log(`[BusinessContextBuilder] Context built successfully for ${businessId}`);
            
            return context;
            
        } catch (error) {
            console.error(`[BusinessContextBuilder] Error building context for ${businessId}:`, error);
            throw error;
        }
    }
    
    /**
     * Build business-specific context using real data only
     * @param {Object} business - Business document
     * @returns {Object} Business context
     */
    buildBusinessContext(business) {
        return {
            name: business.businessName,
            description: business.businessDescription,
            specializations: business.specializations || [],
            yearsInBusiness: business.yearsInBusiness,
            teamMembers: business.teamMembers || [],
            businessHours: business.businessHours,
            locationDetails: business.locationDetails,
            certifications: business.certifications || [],
            awards: business.awards || [],
            insurancePartners: business.insurancePartners || [],
            paymentOptions: business.paymentOptions || [],
            emergencyProtocol: business.emergencyProtocol,
            businessTone: business.businessTone,
            communicationStyle: business.communicationStyle,
            timezone: business.timezone,
            websiteUrl: business.websiteUrl
        };
    }
    
    /**
     * Build services context using real data only
     * @param {Object} services - Services document
     * @returns {Object} Services context
     */
    buildServicesContext(services) {
        if (!services || !services.services) {
            return { services: [], categories: [], featuredServices: [] };
        }
        
        const activeServices = services.services.filter(service => service.isActive !== false);
        const featuredServices = activeServices.filter(service => service.isFeatured);
        const categories = [...new Set(activeServices.map(service => service.category))];
        
        return {
            services: activeServices,
            categories: categories,
            featuredServices: featuredServices,
            serviceCount: activeServices.length,
            categoryCount: categories.length
        };
    }
    
    /**
     * Build knowledge context using real data only
     * @param {Object} knowledge - BusinessKnowledge document
     * @returns {Object} Knowledge context
     */
    buildKnowledgeContext(knowledge) {
        if (!knowledge) {
            return {
                faqs: [],
                commonConcerns: [],
                preAppointmentInfo: [],
                postTreatmentCare: [],
                insuranceInfo: [],
                paymentPlans: [],
                emergencyInfo: {},
                patientResources: [],
                generalInfo: {},
                contactInfo: {},
                operatingInfo: {}
            };
        }
        
        return {
            faqs: knowledge.faqs || [],
            commonConcerns: knowledge.commonConcerns || [],
            preAppointmentInfo: knowledge.preAppointmentInfo || [],
            postTreatmentCare: knowledge.postTreatmentCare || [],
            insuranceInfo: knowledge.insuranceInfo || [],
            paymentPlans: knowledge.paymentPlans || [],
            emergencyInfo: knowledge.emergencyInfo || {},
            patientResources: knowledge.patientResources || [],
            generalInfo: knowledge.generalInfo || {},
            contactInfo: knowledge.contactInfo || {},
            operatingInfo: knowledge.operatingInfo || {}
        };
    }
    
    /**
     * Build contact context using real data only
     * @param {Object} contact - Contact document
     * @returns {Object} Contact context
     */
    buildContactContext(contact) {
        if (!contact) {
            return {
                phone: null,
                email: null,
                address: null,
                emergencyContact: null
            };
        }
        
        return {
            phone: contact.phone,
            email: contact.email,
            address: contact.address,
            emergencyContact: contact.emergencyContact
        };
    }
    
    /**
     * Build extra info context using real data only
     * @param {Object} extraInfo - ExtraInfo document
     * @returns {Object} Extra info context
     */
    buildExtraInfoContext(extraInfo) {
        if (!extraInfo) {
            return {
                patientTestimonials: [],
                technology: [],
                awards: [],
                insuranceDetails: [],
                operatingHours: null,
                accessibility: null,
                languages: []
            };
        }
        
        return {
            patientTestimonials: extraInfo.patientTestimonials || [],
            technology: extraInfo.technology || [],
            awards: extraInfo.awards || [],
            insuranceDetails: extraInfo.insuranceDetails || [],
            operatingHours: extraInfo.operatingHours,
            accessibility: extraInfo.accessibility,
            languages: extraInfo.languages || []
        };
    }
    
    /**
     * Build conversation context
     * @param {Object} conversationContext - ConversationContext document
     * @returns {Object} Conversation context
     */
    buildConversationContext(conversationContext) {
        if (!conversationContext) {
            return {
                previousMessages: [],
                userPreferences: {},
                sessionData: {},
                contextHistory: []
            };
        }
        
        return {
            previousMessages: conversationContext.messages || [],
            userPreferences: conversationContext.userPreferences || {},
            sessionData: conversationContext.sessionData || {},
            contextHistory: conversationContext.contextHistory || []
        };
    }
    
    /**
     * Build dynamic context based on user message
     * @param {Object} context - Full context object
     * @param {string} userMessage - Current user message
     * @returns {Promise<Object>} Dynamic context
     */
    async buildDynamicContext(context, userMessage) {
        const dynamicContext = {
            relevantServices: this.findRelevantServices(context.services.services, userMessage),
            relevantFAQs: this.findRelevantFAQs(context.knowledge.faqs, userMessage),
            relevantConcerns: this.findRelevantConcerns(context.knowledge.commonConcerns, userMessage),
            userIntent: this.detectUserIntent(userMessage),
            urgency: this.detectUrgency(userMessage),
            suggestedActions: [],
            followUpQuestions: []
        };
        
        // Generate suggestions based on context
        dynamicContext.suggestedActions = this.generateSuggestedActions(dynamicContext, context);
        dynamicContext.followUpQuestions = this.generateFollowUpQuestions(dynamicContext, context);
        
        return dynamicContext;
    }
    
    /**
     * Build response guidelines based on business personality
     * @param {Object} business - Business document
     * @returns {Object} Response guidelines
     */
    buildResponseGuidelines(business) {
        return {
            tone: business.businessTone || 'professional',
            communicationStyle: business.communicationStyle || 'empathetic',
            includeBusinessContext: business.aiConfig?.includeBusinessContext !== false,
            includeServiceDetails: business.aiConfig?.includeServiceDetails !== false,
            includeTeamInfo: business.aiConfig?.includeTeamInfo !== false,
            includeTestimonials: business.aiConfig?.includeTestimonials !== false
        };
    }
    
    /**
     * Find services relevant to user message
     * @param {Array} services - Services array
     * @param {string} userMessage - User message
     * @returns {Array} Relevant services
     */
    findRelevantServices(services, userMessage) {
        if (!services || !Array.isArray(services)) {
            return [];
        }
        
        const messageLower = userMessage.toLowerCase();
        const relevantServices = services.filter(service => {
            const serviceName = (service.name || '').toLowerCase();
            const serviceDescription = (service.description || '').toLowerCase();
            const serviceCategory = (service.category || '').toLowerCase();
            
            return serviceName.includes(messageLower) ||
                   serviceDescription.includes(messageLower) ||
                   serviceCategory.includes(messageLower);
        });
        
        return relevantServices.slice(0, 3); // Return top 3 relevant services
    }
    
    /**
     * Find FAQs relevant to user message
     * @param {Array} faqs - FAQs array
     * @param {string} userMessage - User message
     * @returns {Array} Relevant FAQs
     */
    findRelevantFAQs(faqs, userMessage) {
        if (!faqs || !Array.isArray(faqs)) {
            return [];
        }
        
        const messageLower = userMessage.toLowerCase();
        const relevantFAQs = faqs.filter(faq => {
            const question = (faq.question || '').toLowerCase();
            const answer = (faq.answer || '').toLowerCase();
            
            return question.includes(messageLower) || answer.includes(messageLower);
        });
        
        return relevantFAQs.slice(0, 2); // Return top 2 relevant FAQs
    }
    
    /**
     * Find concerns relevant to user message
     * @param {Array} concerns - Concerns array
     * @param {string} userMessage - User message
     * @returns {Array} Relevant concerns
     */
    findRelevantConcerns(concerns, userMessage) {
        if (!concerns || !Array.isArray(concerns)) {
            return [];
        }
        
        const messageLower = userMessage.toLowerCase();
        const relevantConcerns = concerns.filter(concern => {
            const title = (concern.title || '').toLowerCase();
            const description = (concern.description || '').toLowerCase();
            
            return title.includes(messageLower) || description.includes(messageLower);
        });
        
        return relevantConcerns.slice(0, 2); // Return top 2 relevant concerns
    }
    
    /**
     * Detect user intent from message
     * @param {string} userMessage - User message
     * @returns {string} Detected intent
     */
    detectUserIntent(userMessage) {
        const messageLower = userMessage.toLowerCase();
        
        if (messageLower.includes('appointment') || messageLower.includes('schedule') || messageLower.includes('book')) {
            return 'appointment_booking';
        }
        
        if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('fee')) {
            return 'pricing_inquiry';
        }
        
        if (messageLower.includes('service') || messageLower.includes('treatment') || messageLower.includes('procedure')) {
            return 'service_inquiry';
        }
        
        if (messageLower.includes('emergency') || messageLower.includes('urgent') || messageLower.includes('pain')) {
            return 'emergency';
        }
        
        if (messageLower.includes('insurance') || messageLower.includes('coverage')) {
            return 'insurance_inquiry';
        }
        
        if (messageLower.includes('location') || messageLower.includes('address') || messageLower.includes('directions')) {
            return 'location_inquiry';
        }
        
        if (messageLower.includes('hours') || messageLower.includes('open') || messageLower.includes('closed')) {
            return 'hours_inquiry';
        }
        
        return 'general_inquiry';
    }
    
    /**
     * Detect urgency level from message
     * @param {string} userMessage - User message
     * @returns {string} Urgency level
     */
    detectUrgency(userMessage) {
        const messageLower = userMessage.toLowerCase();
        
        if (messageLower.includes('emergency') || messageLower.includes('urgent') || messageLower.includes('immediate')) {
            return 'high';
        }
        
        if (messageLower.includes('asap') || messageLower.includes('soon') || messageLower.includes('quick')) {
            return 'medium';
        }
        
        return 'low';
    }
    
    /**
     * Generate suggested actions based on context
     * @param {Object} dynamicContext - Dynamic context
     * @param {Object} fullContext - Full context
     * @returns {Array} Suggested actions
     */
    generateSuggestedActions(dynamicContext, fullContext) {
        const actions = [];
        
        if (dynamicContext.userIntent === 'appointment_booking') {
            actions.push('Schedule appointment');
            actions.push('Check availability');
        }
        
        if (dynamicContext.userIntent === 'pricing_inquiry') {
            actions.push('Provide pricing information');
            actions.push('Discuss payment options');
        }
        
        if (dynamicContext.userIntent === 'emergency') {
            actions.push('Provide emergency contact');
            actions.push('Schedule urgent appointment');
        }
        
        if (dynamicContext.relevantServices.length > 0) {
            actions.push('Provide service details');
        }
        
        return actions;
    }
    
    /**
     * Generate follow-up questions based on context
     * @param {Object} dynamicContext - Dynamic context
     * @param {Object} fullContext - Full context
     * @returns {Array} Follow-up questions
     */
    generateFollowUpQuestions(dynamicContext, fullContext) {
        const questions = [];
        
        if (dynamicContext.userIntent === 'appointment_booking') {
            questions.push('What type of appointment are you looking for?');
            questions.push('Do you have a preferred date or time?');
        }
        
        if (dynamicContext.userIntent === 'pricing_inquiry') {
            questions.push('Do you have dental insurance?');
            questions.push('Are you looking for a specific treatment?');
        }
        
        if (dynamicContext.userIntent === 'service_inquiry') {
            questions.push('What specific service are you interested in?');
            questions.push('Do you have any specific concerns?');
        }
        
        return questions;
    }
}

export default new BusinessContextBuilder(); 