import Business from '../models/Business.js';
import Service from '../models/Service.js';
import ExtraInfo from '../models/ExtraInfo.js';
import BusinessKnowledge from '../models/BusinessKnowledge.js';
import Contact from '../models/Contact.js';

/**
 * Data Validation Service
 * Ensures data quality and completeness for business profiles
 */
class DataValidationService {
    
    /**
     * Validate business profile completeness
     * @param {string} businessId - Business identifier
     * @returns {Promise<Object>} Validation results
     */
    async validateBusinessProfile(businessId) {
        try {
            console.log(`[DataValidationService] Starting validation for business: ${businessId}`);
            
            const business = await Business.findOne({ businessId });
            if (!business) {
                throw new Error(`Business not found: ${businessId}`);
            }
            
            const validationResults = {
                businessId: businessId,
                overallScore: 0,
                sections: {},
                issues: [],
                recommendations: []
            };
            
            // Validate basic business information
            const basicInfoScore = this.validateBasicBusinessInfo(business);
            validationResults.sections.basicInfo = basicInfoScore;
            
            // Validate contact information
            const contactScore = await this.validateContactInfo(businessId);
            validationResults.sections.contactInfo = contactScore;
            
            // Validate services
            const servicesScore = await this.validateServices(businessId);
            validationResults.sections.services = servicesScore;
            
            // Validate extra information
            const extraInfoScore = await this.validateExtraInfo(businessId);
            validationResults.sections.extraInfo = extraInfoScore;
            
            // Validate knowledge base
            const knowledgeScore = await this.validateKnowledgeBase(businessId);
            validationResults.sections.knowledgeBase = knowledgeScore;
            
            // Calculate overall score
            const scores = Object.values(validationResults.sections);
            validationResults.overallScore = Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length);
            
            // Generate recommendations
            validationResults.recommendations = this.generateRecommendations(validationResults);
            
            console.log(`[DataValidationService] Validation completed for ${businessId}. Overall score: ${validationResults.overallScore}%`);
            
            return validationResults;
            
        } catch (error) {
            console.error(`[DataValidationService] Error validating business profile for ${businessId}:`, error);
            throw error;
        }
    }
    
    /**
     * Validate basic business information
     * @param {Object} business - Business document
     * @returns {Object} Validation score and issues
     */
    validateBasicBusinessInfo(business) {
        const issues = [];
        let score = 0;
        const totalFields = 8;
        
        // Required fields
        if (!business.businessName) {
            issues.push('Business name is missing');
        } else {
            score += 1;
        }
        
        if (!business.websiteUrl) {
            issues.push('Website URL is missing');
        } else {
            score += 1;
        }
        
        // Important optional fields
        if (!business.businessDescription) {
            issues.push('Business description is missing - important for AI context');
        } else {
            score += 1;
        }
        
        if (!business.specializations || business.specializations.length === 0) {
            issues.push('Business specializations are missing - important for AI context');
        } else {
            score += 1;
        }
        
        if (!business.teamMembers || business.teamMembers.length === 0) {
            issues.push('Team member information is missing - important for AI context');
        } else {
            score += 1;
        }
        
        if (!business.businessHours) {
            issues.push('Business hours are missing - important for customer inquiries');
        } else {
            score += 1;
        }
        
        if (!business.locationDetails?.address) {
            issues.push('Business address is missing - important for customer inquiries');
        } else {
            score += 1;
        }
        
        if (!business.yearsInBusiness) {
            issues.push('Years in business is missing - adds credibility');
        } else {
            score += 1;
        }
        
        return {
            score: Math.round((score / totalFields) * 100),
            issues: issues,
            totalFields: totalFields,
            completedFields: score
        };
    }
    
    /**
     * Validate contact information
     * @param {string} businessId 
     * @returns {Promise<Object>} Validation score and issues
     */
    async validateContactInfo(businessId) {
        const issues = [];
        let score = 0;
        const totalFields = 3;
        
        const contact = await Contact.findOne({ businessId });
        
        if (!contact) {
            issues.push('Contact information document is missing');
        } else {
            if (!contact.phone || contact.phone === 'Not found') {
                issues.push('Phone number is missing or invalid');
            } else {
                score += 1;
            }
            
            if (!contact.email || contact.email === 'Not found') {
                issues.push('Email address is missing or invalid');
            } else {
                score += 1;
            }
            
            if (!contact.address || contact.address === 'Not found') {
                issues.push('Address is missing or invalid');
            } else {
                score += 1;
            }
        }
        
        return {
            score: Math.round((score / totalFields) * 100),
            issues: issues,
            totalFields: totalFields,
            completedFields: score
        };
    }
    
    /**
     * Validate services information
     * @param {string} businessId 
     * @returns {Promise<Object>} Validation score and issues
     */
    async validateServices(businessId) {
        const issues = [];
        let score = 0;
        const totalFields = 4;
        
        const services = await Service.findOne({ businessId });
        
        if (!services) {
            issues.push('Services document is missing');
        } else {
            if (!services.services || services.services.length === 0) {
                issues.push('No services are defined');
            } else {
                score += 1;
                
                // Check service quality
                const servicesWithDetails = services.services.filter(service => 
                    service.description && service.description.length > 10
                );
                
                if (servicesWithDetails.length < services.services.length * 0.5) {
                    issues.push('Many services lack detailed descriptions');
                } else {
                    score += 1;
                }
                
                // Check for categorized services
                const categorizedServices = services.services.filter(service => 
                    service.category && service.category !== 'preventive'
                );
                
                if (categorizedServices.length < services.services.length * 0.3) {
                    issues.push('Services should be properly categorized');
                } else {
                    score += 1;
                }
                
                // Check for service benefits
                const servicesWithBenefits = services.services.filter(service => 
                    service.benefits && service.benefits.length > 0
                );
                
                if (servicesWithBenefits.length < services.services.length * 0.5) {
                    issues.push('Many services lack benefit information');
                } else {
                    score += 1;
                }
            }
        }
        
        return {
            score: Math.round((score / totalFields) * 100),
            issues: issues,
            totalFields: totalFields,
            completedFields: score
        };
    }
    
    /**
     * Validate extra information
     * @param {string} businessId 
     * @returns {Promise<Object>} Validation score and issues
     */
    async validateExtraInfo(businessId) {
        const issues = [];
        let score = 0;
        const totalFields = 5;
        
        const extraInfo = await ExtraInfo.findOne({ businessId });
        
        if (!extraInfo) {
            issues.push('Extra information document is missing');
        } else {
            // Check testimonials
            if (!extraInfo.patientTestimonials || extraInfo.patientTestimonials.length === 0) {
                issues.push('Patient testimonials are missing - important for social proof');
            } else {
                score += 1;
            }
            
            // Check technology information
            if (!extraInfo.technology || extraInfo.technology.length === 0) {
                issues.push('Technology/equipment information is missing - shows expertise');
            } else {
                score += 1;
            }
            
            // Check awards and certifications
            if (!extraInfo.awards || extraInfo.awards.length === 0) {
                issues.push('Awards and certifications are missing - adds credibility');
            } else {
                score += 1;
            }
            
            // Check insurance information
            if (!extraInfo.insuranceDetails || extraInfo.insuranceDetails.length === 0) {
                issues.push('Insurance information is missing - important for patients');
            } else {
                score += 1;
            }
            
            // Check operating hours
            if (!extraInfo.operatingHours) {
                issues.push('Operating hours are missing - important for scheduling');
            } else {
                score += 1;
            }
        }
        
        return {
            score: Math.round((score / totalFields) * 100),
            issues: issues,
            totalFields: totalFields,
            completedFields: score
        };
    }
    
    /**
     * Validate knowledge base
     * @param {string} businessId 
     * @returns {Promise<Object>} Validation score and issues
     */
    async validateKnowledgeBase(businessId) {
        const issues = [];
        let score = 0;
        const totalFields = 4;
        
        const knowledge = await BusinessKnowledge.findOne({ businessId });
        
        if (!knowledge) {
            issues.push('Knowledge base document is missing');
        } else {
            // Check FAQs
            if (!knowledge.faqs || knowledge.faqs.length === 0) {
                issues.push('FAQs are missing - important for customer self-service');
            } else {
                score += 1;
            }
            
            // Check common concerns
            if (!knowledge.commonConcerns || knowledge.commonConcerns.length === 0) {
                issues.push('Common concerns are missing - important for AI responses');
            } else {
                score += 1;
            }
            
            // Check pre-appointment information
            if (!knowledge.preAppointmentInfo || knowledge.preAppointmentInfo.length === 0) {
                issues.push('Pre-appointment information is missing - important for patient preparation');
            } else {
                score += 1;
            }
            
            // Check emergency information
            if (!knowledge.emergencyInfo) {
                issues.push('Emergency information is missing - critical for patient safety');
            } else {
                score += 1;
            }
        }
        
        return {
            score: Math.round((score / totalFields) * 100),
            issues: issues,
            totalFields: totalFields,
            completedFields: score
        };
    }
    
    /**
     * Generate data quality report
     * @param {string} businessId 
     * @returns {Promise<Object>} Data quality report
     */
    async generateDataQualityReport(businessId) {
        try {
            const validationResults = await this.validateBusinessProfile(businessId);
            
            const report = {
                businessId: businessId,
                generatedAt: new Date(),
                overallQuality: validationResults.overallScore,
                qualityLevel: this.getQualityLevel(validationResults.overallScore),
                sections: validationResults.sections,
                criticalIssues: validationResults.issues.filter(issue => 
                    issue.includes('missing') || issue.includes('invalid')
                ),
                recommendations: validationResults.recommendations,
                nextSteps: this.generateNextSteps(validationResults)
            };
            
            return report;
            
        } catch (error) {
            console.error(`[DataValidationService] Error generating quality report for ${businessId}:`, error);
            throw error;
        }
    }
    
    /**
     * Suggest improvements based on validation results
     * @param {string} businessId 
     * @returns {Promise<Array>} Improvement suggestions
     */
    async suggestImprovements(businessId) {
        try {
            const validationResults = await this.validateBusinessProfile(businessId);
            const suggestions = [];
            
            // Business profile improvements
            if (validationResults.sections.basicInfo.score < 80) {
                suggestions.push({
                    priority: 'high',
                    category: 'business_profile',
                    suggestion: 'Complete basic business information including description, specializations, and team members',
                    impact: 'High - Essential for AI context and customer understanding',
                    effort: 'medium'
                });
            }
            
            // Contact information improvements
            if (validationResults.sections.contactInfo.score < 100) {
                suggestions.push({
                    priority: 'critical',
                    category: 'contact_info',
                    suggestion: 'Ensure all contact information (phone, email, address) is complete and valid',
                    impact: 'Critical - Required for customer communication',
                    effort: 'low'
                });
            }
            
            // Services improvements
            if (validationResults.sections.services.score < 70) {
                suggestions.push({
                    priority: 'high',
                    category: 'services',
                    suggestion: 'Add detailed descriptions, categories, and benefits for all services',
                    impact: 'High - Essential for AI service recommendations',
                    effort: 'high'
                });
            }
            
            // Knowledge base improvements
            if (validationResults.sections.knowledgeBase.score < 60) {
                suggestions.push({
                    priority: 'medium',
                    category: 'knowledge_base',
                    suggestion: 'Create comprehensive FAQs, common concerns, and pre-appointment information',
                    impact: 'Medium - Improves customer self-service and AI responses',
                    effort: 'high'
                });
            }
            
            return suggestions;
            
        } catch (error) {
            console.error(`[DataValidationService] Error suggesting improvements for ${businessId}:`, error);
            throw error;
        }
    }
    
    /**
     * Helper methods
     */
    
    getQualityLevel(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'fair';
        if (score >= 60) return 'poor';
        return 'critical';
    }
    
    generateRecommendations(validationResults) {
        const recommendations = [];
        
        if (validationResults.overallScore < 80) {
            recommendations.push('Complete missing business information to improve AI response quality');
        }
        
        if (validationResults.sections.contactInfo.score < 100) {
            recommendations.push('Verify and complete all contact information');
        }
        
        if (validationResults.sections.services.score < 70) {
            recommendations.push('Add detailed service descriptions and categories');
        }
        
        if (validationResults.sections.knowledgeBase.score < 60) {
            recommendations.push('Create comprehensive knowledge base for better customer support');
        }
        
        return recommendations;
    }
    
    generateNextSteps(validationResults) {
        const nextSteps = [];
        
        // Prioritize critical issues
        const criticalIssues = validationResults.issues.filter(issue => 
            issue.includes('missing') || issue.includes('invalid')
        );
        
        if (criticalIssues.length > 0) {
            nextSteps.push('Address critical data issues first');
        }
        
        // Focus on high-impact improvements
        if (validationResults.sections.basicInfo.score < 80) {
            nextSteps.push('Complete business profile information');
        }
        
        if (validationResults.sections.services.score < 70) {
            nextSteps.push('Enhance service descriptions and categories');
        }
        
        if (validationResults.sections.knowledgeBase.score < 60) {
            nextSteps.push('Build comprehensive knowledge base');
        }
        
        return nextSteps;
    }
}

export default new DataValidationService(); 