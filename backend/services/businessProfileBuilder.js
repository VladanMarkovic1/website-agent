import Business from '../models/Business.js';
import Service from '../models/Service.js';
import ExtraInfo from '../models/ExtraInfo.js';
import BusinessKnowledge from '../models/BusinessKnowledge.js';
import Contact from '../models/Contact.js';

/**
 * Business Profile Builder Service
 * Automatically builds comprehensive business profiles from scraped data
 */
class BusinessProfileBuilder {
    
    /**
     * Main profile builder function
     * @param {string} businessId - Business identifier
     * @returns {Promise<Object>} Built business profile
     */
    async buildBusinessProfile(businessId) {
        try {
            console.log(`[BusinessProfileBuilder] Starting profile build for business: ${businessId}`);
            
            // Get existing business data
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error(`Business not found: ${businessId}`);
            }
            
            // Get scraped data (assuming it's saved somewhere)
            const scrapedData = await this.getScrapedData(businessId);
            
            // Build enhanced business profile
            const enhancedBusiness = await this.enhanceBusinessData(business, scrapedData);
            
            // Build enhanced service data
            const enhancedServices = await this.enhanceServiceData(businessId, scrapedData);
            
            // Build enhanced extra info
            const enhancedExtraInfo = await this.enhanceExtraInfo(businessId, scrapedData);
            
            // Build knowledge base
            const knowledgeBase = await this.buildKnowledgeBase(businessId, scrapedData);
            
            // Update contact information
            const enhancedContact = await this.enhanceContactInfo(businessId, scrapedData);
            
            console.log(`[BusinessProfileBuilder] Profile build completed for business: ${businessId}`);
            
            return {
                business: enhancedBusiness,
                services: enhancedServices,
                extraInfo: enhancedExtraInfo,
                knowledge: knowledgeBase,
                contact: enhancedContact,
                profileQuality: this.calculateProfileQuality(enhancedBusiness, enhancedServices, enhancedExtraInfo)
            };
            
        } catch (error) {
            console.error(`[BusinessProfileBuilder] Error building profile for ${businessId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get scraped data for business
     * @param {string} businessId 
     * @returns {Promise<Object>} Scraped data
     */
    async getScrapedData(businessId) {
        // This would typically come from your scraper's saved data
        // For now, we'll return a mock structure
        return {
            services: [],
            contactDetails: {},
            faqs: [],
            businessDescription: '',
            specializations: [],
            teamMembers: [],
            testimonials: [],
            technology: [],
            awards: [],
            insurance: [],
            operatingHours: ''
        };
    }
    
    /**
     * Enhance business data with scraped information
     * @param {Object} business - Existing business document
     * @param {Object} scrapedData - Scraped data
     * @returns {Promise<Object>} Enhanced business data
     */
    async enhanceBusinessData(business, scrapedData) {
        const updates = {};
        
        // Update business description if not already set
        if (scrapedData.businessDescription && !business.businessDescription) {
            updates.businessDescription = scrapedData.businessDescription;
        }
        
        // Update specializations
        if (scrapedData.specializations && scrapedData.specializations.length > 0) {
            updates.specializations = scrapedData.specializations;
        }
        
        // Update team members
        if (scrapedData.teamMembers && scrapedData.teamMembers.length > 0) {
            updates.teamMembers = scrapedData.teamMembers;
        }
        
        // Update business hours if available
        if (scrapedData.operatingHours && !business.businessHours) {
            updates.businessHours = this.parseBusinessHours(scrapedData.operatingHours);
        }
        
        // Update location details if available
        if (scrapedData.contactDetails?.address && !business.locationDetails?.address) {
            updates.locationDetails = {
                address: scrapedData.contactDetails.address,
                city: this.extractCity(scrapedData.contactDetails.address),
                state: this.extractState(scrapedData.contactDetails.address),
                zipCode: this.extractZipCode(scrapedData.contactDetails.address)
            };
        }
        
        // Update insurance partners
        if (scrapedData.insurance && scrapedData.insurance.length > 0) {
            updates.insurancePartners = scrapedData.insurance.map(ins => ins.provider);
        }
        
        // Update years in business if not set
        if (!business.yearsInBusiness) {
            updates.yearsInBusiness = this.extractYearsInBusiness(scrapedData.businessDescription);
        }
        
        // Update certifications
        if (scrapedData.awards && scrapedData.awards.length > 0) {
            updates.certifications = scrapedData.awards
                .filter(award => award.organization && award.organization.toLowerCase().includes('certification'))
                .map(award => award.name);
        }
        
        // Update awards
        if (scrapedData.awards && scrapedData.awards.length > 0) {
            updates.awards = scrapedData.awards
                .filter(award => !award.organization?.toLowerCase().includes('certification'))
                .map(award => award.name);
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            Object.assign(business, updates);
            await business.save();
            console.log(`[BusinessProfileBuilder] Enhanced business data for ${business.businessId}`);
        }
        
        return business;
    }
    
    /**
     * Enhance service data with detailed information
     * @param {string} businessId 
     * @param {Object} scrapedData 
     * @returns {Promise<Object>} Enhanced service data
     */
    async enhanceServiceData(businessId, scrapedData) {
        let serviceDoc = await Service.findOne({ businessId });
        
        if (!serviceDoc) {
            serviceDoc = new Service({ businessId, services: [] });
        }
        
        // Enhance existing services with scraped data
        if (scrapedData.services && scrapedData.services.length > 0) {
            const enhancedServices = scrapedData.services.map(serviceName => {
                const existingService = serviceDoc.services.find(s => 
                    s.name.toLowerCase() === serviceName.toLowerCase()
                );
                
                if (existingService) {
                    // Enhance existing service
                    return this.enhanceServiceDetails(existingService, serviceName);
                } else {
                    // Create new service
                    return this.createServiceFromScrapedData(serviceName);
                }
            });
            
            serviceDoc.services = enhancedServices;
            await serviceDoc.save();
            console.log(`[BusinessProfileBuilder] Enhanced ${enhancedServices.length} services for ${businessId}`);
        }
        
        return serviceDoc;
    }
    
    /**
     * Enhance extra info with scraped data
     * @param {string} businessId 
     * @param {Object} scrapedData 
     * @returns {Promise<Object>} Enhanced extra info
     */
    async enhanceExtraInfo(businessId, scrapedData) {
        let extraInfoDoc = await ExtraInfo.findOne({ businessId });
        
        if (!extraInfoDoc) {
            extraInfoDoc = new ExtraInfo({ businessId });
        }
        
        // Update testimonials
        if (scrapedData.testimonials && scrapedData.testimonials.length > 0) {
            extraInfoDoc.patientTestimonials = scrapedData.testimonials;
        }
        
        // Update technology
        if (scrapedData.technology && scrapedData.technology.length > 0) {
            extraInfoDoc.technology = scrapedData.technology;
        }
        
        // Update awards
        if (scrapedData.awards && scrapedData.awards.length > 0) {
            extraInfoDoc.awards = scrapedData.awards;
        }
        
        // Update operating hours
        if (scrapedData.operatingHours && !extraInfoDoc.operatingHours) {
            extraInfoDoc.operatingHours = scrapedData.operatingHours;
        }
        
        // Update insurance details
        if (scrapedData.insurance && scrapedData.insurance.length > 0) {
            extraInfoDoc.insuranceDetails = scrapedData.insurance;
        }
        
        await extraInfoDoc.save();
        console.log(`[BusinessProfileBuilder] Enhanced extra info for ${businessId}`);
        
        return extraInfoDoc;
    }
    
    /**
     * Build knowledge base from scraped data
     * @param {string} businessId 
     * @param {Object} scrapedData 
     * @returns {Promise<Object>} Knowledge base
     */
    async buildKnowledgeBase(businessId, scrapedData) {
        let knowledgeDoc = await BusinessKnowledge.findOne({ businessId });
        
        if (!knowledgeDoc) {
            knowledgeDoc = new BusinessKnowledge({ businessId });
        }
        
        // Build FAQs from scraped data
        if (scrapedData.faqs && scrapedData.faqs.length > 0) {
            knowledgeDoc.faqs = scrapedData.faqs.map(faq => ({
                question: faq.question,
                answer: faq.answer,
                category: this.categorizeFAQ(faq.question),
                tags: this.extractTags(faq.question),
                priority: 1,
                isActive: true
            }));
        }
        
        // Build common concerns from services
        if (scrapedData.services && scrapedData.services.length > 0) {
            knowledgeDoc.commonConcerns = scrapedData.services.map(service => ({
                concern: `Information about ${service}`,
                description: `Patient inquiries about ${service}`,
                response: `We provide comprehensive ${service} services. Would you like to learn more or schedule a consultation?`,
                relatedServices: [service],
                urgency: 'low',
                keywords: [service.toLowerCase()],
                followUpQuestions: [
                    `What does ${service} involve?`,
                    `How long does ${service} take?`,
                    `What is the cost of ${service}?`
                ]
            }));
        }
        
        // Build pre-appointment information
        knowledgeDoc.preAppointmentInfo = [
            {
                title: 'General Consultation',
                instructions: [
                    'Please arrive 15 minutes before your appointment',
                    'Bring your ID and insurance card',
                    'Complete any required forms',
                    'List any current medications'
                ],
                requiredDocuments: ['ID', 'Insurance Card', 'Medical History'],
                preparationSteps: [
                    'Brush and floss your teeth',
                    'Avoid eating 1 hour before appointment',
                    'Bring list of current medications'
                ],
                whatToBring: ['ID', 'Insurance Card', 'List of Medications'],
                whatNotToDo: ['Eat heavy meals', 'Drink alcohol', 'Smoke'],
                duration: '30-60 minutes',
                specialNotes: 'Please inform us of any special needs or accommodations required'
            }
        ];
        
        // Build emergency information
        knowledgeDoc.emergencyInfo = {
            emergencyContact: scrapedData.contactDetails?.phone || 'Call 911 for emergencies',
            afterHoursContact: scrapedData.contactDetails?.phone || 'Call main office',
            emergencyProtocol: 'For dental emergencies, call our emergency line or visit the nearest emergency room',
            urgentCareInstructions: 'If you have severe pain, swelling, or bleeding, seek immediate medical attention',
            whenToSeekEmergency: [
                'Severe tooth pain',
                'Swelling in face or mouth',
                'Bleeding that won\'t stop',
                'Broken jaw',
                'Knocked out tooth'
            ],
            emergencySymptoms: [
                'Severe pain',
                'Swelling',
                'Bleeding',
                'Difficulty breathing',
                'Fever'
            ],
            nearestHospital: 'Contact local emergency services',
            nearestUrgentCare: 'Contact local urgent care facilities'
        };
        
        await knowledgeDoc.save();
        console.log(`[BusinessProfileBuilder] Built knowledge base for ${businessId}`);
        
        return knowledgeDoc;
    }
    
    /**
     * Enhance contact information
     * @param {string} businessId 
     * @param {Object} scrapedData 
     * @returns {Promise<Object>} Enhanced contact info
     */
    async enhanceContactInfo(businessId, scrapedData) {
        let contactDoc = await Contact.findOne({ businessId });
        
        if (!contactDoc) {
            contactDoc = new Contact({ businessId });
        }
        
        // Update contact details from scraped data
        if (scrapedData.contactDetails) {
            if (scrapedData.contactDetails.phone && scrapedData.contactDetails.phone !== 'Not found') {
                contactDoc.phone = scrapedData.contactDetails.phone;
            }
            if (scrapedData.contactDetails.email && scrapedData.contactDetails.email !== 'Not found') {
                contactDoc.email = scrapedData.contactDetails.email;
            }
            if (scrapedData.contactDetails.address && scrapedData.contactDetails.address !== 'Not found') {
                contactDoc.address = scrapedData.contactDetails.address;
            }
        }
        
        await contactDoc.save();
        console.log(`[BusinessProfileBuilder] Enhanced contact info for ${businessId}`);
        
        return contactDoc;
    }
    
    /**
     * Helper methods
     */
    
    parseBusinessHours(hoursText) {
        // Simple parser for business hours
        const hours = {
            monday: { open: "09:00", close: "17:00", closed: false },
            tuesday: { open: "09:00", close: "17:00", closed: false },
            wednesday: { open: "09:00", close: "17:00", closed: false },
            thursday: { open: "09:00", close: "17:00", closed: false },
            friday: { open: "09:00", close: "17:00", closed: false },
            saturday: { open: "09:00", close: "13:00", closed: true },
            sunday: { open: "09:00", close: "13:00", closed: true }
        };
        
        // Basic parsing logic - can be enhanced
        if (hoursText.toLowerCase().includes('closed')) {
            hours.saturday.closed = true;
            hours.sunday.closed = true;
        }
        
        return hours;
    }
    
    extractCity(address) {
        const cityMatch = address.match(/,\s*([^,]+),\s*[A-Z]{2}/);
        return cityMatch ? cityMatch[1].trim() : '';
    }
    
    extractState(address) {
        const stateMatch = address.match(/,\s*[A-Z]{2}\s*\d{5}/);
        return stateMatch ? stateMatch[0].match(/[A-Z]{2}/)[0] : '';
    }
    
    extractZipCode(address) {
        const zipMatch = address.match(/\d{5}/);
        return zipMatch ? zipMatch[0] : '';
    }
    
    extractYearsInBusiness(description) {
        const yearMatch = description.match(/(\d+)\s+years?/i);
        return yearMatch ? parseInt(yearMatch[1]) : null;
    }
    
    enhanceServiceDetails(existingService, serviceName) {
        // Enhance existing service with additional details
        return {
            ...existingService.toObject(),
            description: existingService.description || `Professional ${serviceName} services`,
            category: existingService.category || this.categorizeService(serviceName),
            urgency: existingService.urgency || 'routine',
            isActive: true,
            isFeatured: false
        };
    }
    
    createServiceFromScrapedData(serviceName) {
        return {
            name: serviceName,
            description: `Professional ${serviceName} services`,
            price: '',
            manualOverride: false,
            category: this.categorizeService(serviceName),
            urgency: 'routine',
            ageGroup: 'all',
            isActive: true,
            isFeatured: false,
            popularity: 0,
            rating: 0,
            keywords: [serviceName.toLowerCase()],
            benefits: [`Professional ${serviceName} treatment`],
            risks: [],
            alternatives: []
        };
    }
    
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
    
    categorizeFAQ(question) {
        const questionLower = question.toLowerCase();
        
        if (questionLower.includes('appointment') || questionLower.includes('schedule')) {
            return 'appointments';
        } else if (questionLower.includes('insurance') || questionLower.includes('payment')) {
            return 'insurance';
        } else if (questionLower.includes('cost') || questionLower.includes('price')) {
            return 'payment';
        } else if (questionLower.includes('emergency') || questionLower.includes('urgent')) {
            return 'emergency';
        } else {
            return 'general';
        }
    }
    
    extractTags(text) {
        const tags = [];
        const keywords = ['appointment', 'cost', 'insurance', 'emergency', 'pain', 'cleaning', 'whitening'];
        
        keywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword)) {
                tags.push(keyword);
            }
        });
        
        return tags;
    }
    
    calculateProfileQuality(business, services, extraInfo) {
        let score = 0;
        let total = 0;
        
        // Business profile completeness
        if (business.businessDescription) score += 20;
        if (business.specializations && business.specializations.length > 0) score += 15;
        if (business.teamMembers && business.teamMembers.length > 0) score += 15;
        if (business.businessHours) score += 10;
        total += 60;
        
        // Services completeness
        if (services.services && services.services.length > 0) score += 20;
        total += 20;
        
        // Extra info completeness
        if (extraInfo.patientTestimonials && extraInfo.patientTestimonials.length > 0) score += 10;
        if (extraInfo.technology && extraInfo.technology.length > 0) score += 5;
        if (extraInfo.awards && extraInfo.awards.length > 0) score += 5;
        total += 20;
        
        return Math.round((score / total) * 100);
    }
}

export default new BusinessProfileBuilder(); 