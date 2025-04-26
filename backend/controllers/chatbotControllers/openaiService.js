// import OpenAI from "openai"; // No longer needed here
import dotenv from "dotenv";
import { classifyUserIntent, findServiceNameInMessage } from "./messageClassifier.js";
import { handleServiceInquiry } from "./serviceMatcher.js";
import { generateAIFallbackResponse } from "./aiFallbackService.js";
import {
    // CHATBOT_PERSONALITY, // Not needed directly here anymore
    RESPONSE_TEMPLATES,
    DENTAL_PROBLEMS,
    TIME_PREFERENCE_KEYWORDS // Added TIME_PREFERENCE_KEYWORDS
} from "./chatbotConstants.js";
import { extractContactInfo } from "./extractContactInfo.js"; // Only import extractContactInfo
import { redactPII } from '../../utils/piiFilter.js'; // Added this import

dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Moved to aiFallbackService

// Removed handleServiceInquiry (moved to serviceMatcher.js)
// Removed _generateOpenAIFallback (moved to aiFallbackService.js)

// Restore local definition of createMissingInfoPrompt
const createMissingInfoPrompt = (missingFields, providedInfo) => {
    let prompt = "";
    if (providedInfo.name && providedInfo.phone && !providedInfo.email) {
        prompt = `Thanks, ${providedInfo.name}! Got your phone number. Could you also provide your email address?`;
    } else if (providedInfo.name && !providedInfo.phone && providedInfo.email) {
        prompt = `Thanks, ${providedInfo.name}! Got your email. Could you also provide your phone number?`;
    } else if (!providedInfo.name && providedInfo.phone && providedInfo.email) {
        prompt = `Got your phone and email! Could you please provide your full name too?`;
    } else if (providedInfo.name && !providedInfo.phone && !providedInfo.email) {
        prompt = `Thanks, ${providedInfo.name}! Could you also share your phone number and email address?`;
    } else if (!providedInfo.name && providedInfo.phone && !providedInfo.email) {
        prompt = `Got your phone number! Could you also share your name and email address?`;
    } else if (!providedInfo.name && !providedInfo.phone && providedInfo.email) {
        prompt = `Got your email address! Could you also share your name and phone number?`;
    } else {
        // Default fallback if logic somehow misses a case (shouldn't happen)
        prompt = RESPONSE_TEMPLATES.contact_after_yes; 
    }
    return prompt;
};

// --- Main Exported Function (Orchestrator) --- 

export const generateAIResponse = async (message, businessData, messageHistory = [], isNewSession = false, previousPartialInfo = { name: null, phone: null, email: null }, sessionServiceInterest = null) => {
    try {
        // console.log('--- generateAIResponse Orchestrator Start ---');
        // console.log('User Message:', message); // Potential PII - Removed
        // console.log('Previous Partial Info:', previousPartialInfo); // Potential PII - Removed
        // console.log('Session Service Interest:', sessionServiceInterest); 
        const lastBotMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();
        const normalizedMessage = message.toLowerCase().trim(); // Normalize once here

        // 1. Classify Intent
        const intent = classifyUserIntent(message, messageHistory, businessData.services, isNewSession, previousPartialInfo);
        // console.log('Classified Intent:', JSON.stringify(intent));

        let responsePayload = {};

        // 2. Handle Intent based on Classification
        // console.log(`[generateAIResponse] Entering switch with intent type: ${intent.type}`); // Log before switch
        switch (intent.type) {
            case 'CONTACT_INFO_PROVIDED':
                // console.log('[generateAIResponse] Matched case: CONTACT_INFO_PROVIDED');
                const contactInfo = intent.contactInfo; // Already contains full accumulated info
                
                // --- MODIFIED LOGIC FOR serviceContext ---
                // Prioritize sessionServiceInterest if it exists and is specific
                let determinedServiceContext = 'your dental needs'; // Default
                if (sessionServiceInterest && sessionServiceInterest !== 'your dental needs' && sessionServiceInterest !== 'Dental Consultation' && sessionServiceInterest !== 'General Inquiry') {
                    determinedServiceContext = sessionServiceInterest;
                    // console.log(`[generateAIResponse] Using session service interest: ${determinedServiceContext}`);
                } else if (contactInfo.service) {
                    // Fallback 1: Service extracted alongside contact info
                    determinedServiceContext = contactInfo.service;
                    // console.log(`[generateAIResponse] Using service extracted with contact info: ${determinedServiceContext}`);
                } else if (lastBotMessage?.detectedService) {
                    // Fallback 2: Service detected in last bot message (less reliable)
                    determinedServiceContext = lastBotMessage.detectedService;
                    // console.log(`[generateAIResponse] Using service from last bot message: ${determinedServiceContext}`);
                } else {
                    // console.log(`[generateAIResponse] Using default service context: ${determinedServiceContext}`);
                }
                // --- END MODIFIED LOGIC ---
                
                const businessPhoneNumber = businessData?.businessPhoneNumber;
                
                // Updated confirmation message emphasizing the call back for scheduling
                const confirmationPrefix = `✅ Thank you, ${contactInfo.name}! Your information has been received. We\'ve noted your interest in ${determinedServiceContext}.\n\n`; // Use determined context
                // Revised suffix to mention booking ideal time - REMOVED REDACTION
                const scheduleSuffix = `🧑‍⚕️ Our team will call you back at ${contactInfo.phone} as soon as possible during business hours to discuss your needs and book your ideal appointment time.\n\n`;
                const callUsSuffix = businessPhoneNumber
                    ? `📞 If your situation requires immediate attention or you prefer to speak with us sooner, please feel free to call us directly at ${businessPhoneNumber}.`
                    : ''; // Omit if no phone number
                
                responsePayload = {
                    type: 'CONTACT_INFO',
                    response: confirmationPrefix + scheduleSuffix + callUsSuffix, // Assemble the message
                    contactInfo: contactInfo, // Pass the complete, accumulated info
                    serviceContext: determinedServiceContext // Use the determined context
                };
                break;

            case 'PARTIAL_CONTACT_INFO_PROVIDED':
                // console.log('[generateAIResponse] Matched case: PARTIAL_CONTACT_INFO_PROVIDED');
                responsePayload = {
                    type: 'PARTIAL_CONTACT_REQUEST', // Indicate bot is asking for more
                    response: createMissingInfoPrompt(intent.missingFields, intent.contactInfo),
                    contactInfo: intent.contactInfo // Pass back the updated partial info
                };
                break;

            case 'CONFIRMATION_YES':
                // console.log('[generateAIResponse] Matched case: CONFIRMATION_YES');
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: RESPONSE_TEMPLATES.contact_after_yes // Uses the updated template
                };
                break;

            case 'SERVICE_INQUIRY_EXPLICIT':
                // console.log('[generateAIResponse] Matched case: SERVICE_INQUIRY_EXPLICIT'); 
                // Call the dedicated service matcher
                const matchedService = await handleServiceInquiry(normalizedMessage, businessData.services);
                if (matchedService) {
                    // Construct response using matched service data
                     const serviceDescription = matchedService.description || 
                        `${matchedService.name} is one of our specialized dental services`;
                    responsePayload = {
                        type: 'SERVICE_INQUIRY',
                        detectedService: matchedService.name,
                        serviceContext: matchedService.name,
                        response: `${serviceDescription}\n\nWould you like to schedule a consultation with our ${matchedService.name} specialist? I can help arrange that. 😊`
                    };
                } else {
                    // Fallback to AI if explicit inquiry but no match
                    // console.log('Explicit inquiry keywords but no specific service match. Falling back to AI.');
                    responsePayload = await generateAIFallbackResponse(message, messageHistory);
                }
                break;
            
            case 'PROBLEM_FOLLOWUP':
                // console.log('[generateAIResponse] Matched case: PROBLEM_FOLLOWUP');
                // This logic depends on constants and context, reasonable to keep here
                let suggestedServices = [];
                const problemCategory = intent.problemCategory;
                if (problemCategory === 'damage') suggestedServices = ['Dental Crowns', 'Dental Bonding', 'Veneers', 'Fillings'];
                else if (problemCategory === 'pain') suggestedServices = ['Root Canal Treatment', 'Tooth Extraction', 'Emergency Consultation'];
                else if (problemCategory === 'sensitivity') suggestedServices = ['Sensitivity Treatment', 'Fillings', 'Dental Sealants'];
                
                const availableServices = businessData.services.map(s => s.name);
                const relevantServices = suggestedServices.filter(s => 
                    availableServices.some(as => as.toLowerCase().includes(s.toLowerCase()))
                );

                if (relevantServices.length > 0) {
                    responsePayload = {
                        type: 'PROBLEM_FOLLOWUP',
                        response: 
                            RESPONSE_TEMPLATES.problem_followup_prefix(problemCategory) + 
                            relevantServices.map(s => `• ${s}`).join('\n') + 
                            RESPONSE_TEMPLATES.problem_followup_suffix
                    };
                } else {
                    responsePayload = {
                        type: 'PROBLEM_FOLLOWUP',
                        response: RESPONSE_TEMPLATES.problem_followup_fallback(problemCategory)
                    };
                }
                break;

            case 'DENTAL_PROBLEM':
                 // console.log('[generateAIResponse] Matched case: DENTAL_PROBLEM');
                 // This logic depends on constants and context, reasonable to keep here
                let responseTemplate;
                let concernDetail = intent.category; // e.g., 'pain', 'appearance'
                if (intent.severity === 'high') {
                    responseTemplate = RESPONSE_TEMPLATES.emergency;
                } else if (intent.category === 'appearance') {
                    // Keep specific handling for visual concerns
                    responseTemplate = RESPONSE_TEMPLATES.visual_concern;
                    const appearanceKeywords = DENTAL_PROBLEMS.appearance;
                    const mentionedKeyword = appearanceKeywords.find(k => normalizedMessage.includes(k));
                    if (mentionedKeyword) {
                        const regex = new RegExp(`(\w+\s+)?${mentionedKeyword}(\s+\w+)?`, 'i');
                        const match = normalizedMessage.match(regex);
                        concernDetail = match ? match[0] : mentionedKeyword; 
                    } else {
                        concernDetail = 'visual change'; 
                    }
                } else {
                    // Use the new template for other non-high severity symptoms (like pain)
                    responseTemplate = RESPONSE_TEMPLATES.acknowledge_symptom; 
                }
                responsePayload = {
                    type: 'DENTAL_PROBLEM',
                    // Pass the category (e.g., 'pain') to the template function
                    response: typeof responseTemplate === 'function' ? responseTemplate(concernDetail) : responseTemplate,
                    problemCategory: intent.category,
                    severity: intent.severity
                };
                break;

            case 'GREETING':
                // console.log('[generateAIResponse] Matched case: GREETING');
                responsePayload = {
                    type: 'GREETING',
                    response: RESPONSE_TEMPLATES.greeting
                };
                break;

            case 'REQUEST_SERVICE_LIST':
                 // console.log('[generateAIResponse] Matched case: REQUEST_SERVICE_LIST');
                 // This logic depends on context, reasonable to keep here
                if (businessData.services && businessData.services.length > 0) {
                    // Helper function to decode &amp; repeatedly
                    const decodeAmps = (text) => {
                        if (!text) return text;
                        let decoded = text;
                        // Keep replacing &amp; until none are left
                        while (decoded.includes('&amp;')) {
                            decoded = decoded.replace(/&amp;/g, '&');
                        }
                        return decoded;
                    };
                    // Map and decode service names
                    const serviceNames = businessData.services.map(s => `• ${decodeAmps(s.name)}`).join('\n');
                    responsePayload = {
                        type: 'SERVICE_LIST',
                        response: RESPONSE_TEMPLATES.service_list_prefix + serviceNames + RESPONSE_TEMPLATES.service_list_suffix
                    };
                } else {
                     // Fallback to AI if no services defined
                     responsePayload = await generateAIFallbackResponse(message, messageHistory);
                }
                break;

            case 'APPOINTMENT_REQUEST':
                // console.log('[generateAIResponse] Matched case: APPOINTMENT_REQUEST');
                
                // Attempt to extract details from the current message
                const serviceName = findServiceNameInMessage(normalizedMessage, businessData?.services);
                const timePreference = TIME_PREFERENCE_KEYWORDS.find(kw => normalizedMessage.includes(kw)); // Find first match

                // console.log(`[generateAIResponse] Extracted details for appointment request - Service: ${serviceName}, Time: ${timePreference}`);

                responsePayload = {
                    type: 'APPOINTMENT_REQUEST_DETAILED', // Use a more specific type if needed for overrides
                    response: RESPONSE_TEMPLATES.APPOINTMENT_REQUEST_ACKNOWLEDGE_DETAIL(serviceName, timePreference) 
                };
                
                break;

            case 'OPERATING_HOURS_INQUIRY':
                // console.log('[generateAIResponse] Matched case: OPERATING_HOURS_INQUIRY');
                if (businessData?.operatingHours) {
                    responsePayload = {
                        type: 'OPERATING_HOURS_INFO',
                        response: RESPONSE_TEMPLATES.OPERATING_HOURS_RESPONSE(businessData.operatingHours)
                    };
                } else {
                    responsePayload = {
                        type: 'OPERATING_HOURS_UNAVAILABLE',
                        response: RESPONSE_TEMPLATES.HOURS_UNAVAILABLE_FALLBACK
                    };
                }
                break;

            case 'SERVICE_FAQ':
                // console.log('[generateAIResponse] Matched case: SERVICE_FAQ');
                // ... existing code ...
                break;

            case 'UNKNOWN':
            default:
                // console.log('[generateAIResponse] Matched case: UNKNOWN/default - Calling AI Fallback'); 
                // Fallback to AI for anything not classified
                responsePayload = await generateAIFallbackResponse(message, messageHistory);
                break;
        }
        // console.log('[generateAIResponse] Exiting switch, final responsePayload:', JSON.stringify(responsePayload)); // Potential PII - Removed

        // console.log('--- generateAIResponse Orchestrator End ---');
        // Return both the original classified intent and the final payload
        return {
            classifiedIntent: intent, // The original result from classifyUserIntent
            responsePayload: {
                 type: responsePayload.type || 'ERROR',
                 response: responsePayload.response || RESPONSE_TEMPLATES.error_fallback,
                 contactInfo: responsePayload.contactInfo || null, 
                 serviceContext: responsePayload.serviceContext || null, 
                 problemCategory: responsePayload.problemCategory || null 
            }
        };

    } catch (error) {
        console.error("Error in generateAIResponse orchestrator:", error);
        // Still need to return the expected structure even on error
        return {
             classifiedIntent: { type: 'ERROR', contactInfo: null }, // Provide a minimal classifiedIntent
             responsePayload: {
                 type: 'ERROR',
                 response: RESPONSE_TEMPLATES.error_fallback,
                 contactInfo: null,
                 serviceContext: null,
                 problemCategory: null
             }
        };
    }
};
