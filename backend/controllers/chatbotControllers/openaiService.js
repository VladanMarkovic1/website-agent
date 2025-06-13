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

// --- REVISED Helper function to decode HTML entities --- 
const decodeHtmlEntities = (text) => {
    if (!text) return text;
    let decoded = text;
    
    // 1. Repeatedly decode &amp; first
    while (decoded.includes('&amp;')) {
        decoded = decoded.replace(/&amp;/g, '&');
    }
    
    // 2. Decode other common named entities
    decoded = decoded.replace(/&lt;/g, '<');
    decoded = decoded.replace(/&gt;/g, '>');
    decoded = decoded.replace(/&quot;/g, '"');
    decoded = decoded.replace(/&apos;/g, "'"); // Note: &apos; is less common but good to include
    
    // 3. Decode numeric entities (decimal and hex)
    // Ensure this runs *after* &amp; has been fully resolved
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    return decoded;
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
        // console.log('[openaiService] Classified Intent:', JSON.stringify(intent, null, 2)); // To be removed/commented
        // console.log('[openaiService] User Message for this Intent:', message); // To be removed/commented
        // console.log('Classified Intent:', JSON.stringify(intent)); // Ensure this remains commented or is removed

        let responsePayload = {};

        // 2. Handle Intent based on Classification
        // console.log(`[generateAIResponse] Entering switch with intent type: ${intent.type}`); // To be removed/commented
        switch (intent.type) {
            case 'CONTACT_INFO_PROVIDED':
                // console.log('[generateAIResponse] Matched case: CONTACT_INFO_PROVIDED'); // To be removed/commented
                const contactInfo = intent.contactInfo; // Already contains full accumulated info
                
                // --- MODIFIED LOGIC FOR serviceContext ---
                // Prioritize sessionServiceInterest if it exists and is specific
                let determinedServiceContext = 'your dental needs'; // Default
                if (sessionServiceInterest && sessionServiceInterest !== 'your dental needs' && sessionServiceInterest !== 'Dental Consultation' && sessionServiceInterest !== 'General Inquiry') {
                    determinedServiceContext = sessionServiceInterest;
                    // console.log(`[generateAIResponse] Using session service interest: ${determinedServiceContext}`); // To be removed/commented
                } else if (contactInfo.service) {
                    // Fallback 1: Service extracted alongside contact info
                    determinedServiceContext = contactInfo.service;
                    // console.log(`[generateAIResponse] Using service extracted with contact info: ${determinedServiceContext}`); // To be removed/commented
                } else if (lastBotMessage?.detectedService) {
                    // Fallback 2: Service detected in last bot message (less reliable)
                    determinedServiceContext = lastBotMessage.detectedService;
                    // console.log(`[generateAIResponse] Using service from last bot message: ${determinedServiceContext}`); // To be removed/commented
                } else {
                    // console.log(`[generateAIResponse] Using default service context: ${determinedServiceContext}`); // To be removed/commented
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
                // console.log('[generateAIResponse] Matched case: PARTIAL_CONTACT_INFO_PROVIDED'); // To be removed/commented
                responsePayload = {
                    type: 'PARTIAL_CONTACT_REQUEST', // Indicate bot is asking for more
                    response: createMissingInfoPrompt(intent.missingFields, intent.contactInfo),
                    contactInfo: intent.contactInfo // Pass back the updated partial info
                };
                break;

            case 'CONFIRMATION_YES':
                // console.log('[generateAIResponse] Matched case: CONFIRMATION_YES'); // To be removed/commented
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: RESPONSE_TEMPLATES.contact_after_yes // Uses the updated template
                };
                break;

            case 'SERVICE_INQUIRY_EXPLICIT':
                // console.log('[generateAIResponse] Matched case: SERVICE_INQUIRY_EXPLICIT'); // To be removed/commented
                // If the user message is a question, delegate to AI for a richer response
                if (message.trim().endsWith('?')) {
                    responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
                    break;
                }
                // Otherwise, call the dedicated service matcher
                const matchedService = await handleServiceInquiry(normalizedMessage, businessData.services);
                if (matchedService) {
                    // Construct response using matched service data
                     // Apply decoding to the description
                     const serviceDescription = decodeHtmlEntities(matchedService.description) || // USE NEW FUNCTION
                        `${decodeHtmlEntities(matchedService.name)} is one of our specialized dental services`; // USE NEW FUNCTION & Decode name too for consistency
                    responsePayload = {
                        type: 'SERVICE_INQUIRY',
                        detectedService: decodeHtmlEntities(matchedService.name), // USE NEW FUNCTION & Decode name here too
                        serviceContext: decodeHtmlEntities(matchedService.name), // USE NEW FUNCTION & Decode name here too
                        response: `${serviceDescription}\n\nWould you like to schedule a consultation with our ${decodeHtmlEntities(matchedService.name)} specialist? I can help arrange that. 😊` // USE NEW FUNCTION & Decode name here too
                    };
                } else {
                    // Fallback to AI if explicit inquiry but no match
                    // console.log('Explicit inquiry keywords but no specific service match. Falling back to AI.'); // To be removed/commented
                    // Pass businessData to the fallback function
                    responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
                }
                break;
            
            case 'PROBLEM_FOLLOWUP':
                // console.log('[generateAIResponse] Matched case: PROBLEM_FOLLOWUP'); // To be removed/commented
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
                 // console.log('[generateAIResponse] Matched case: DENTAL_PROBLEM'); // To be removed/commented
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
                // For greetings, do not send a welcome message. Instead, use OpenAI fallback to continue the conversation naturally.
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
                break;

            case 'REQUEST_SERVICE_LIST':
                 // console.log('[generateAIResponse] Matched case: REQUEST_SERVICE_LIST'); // To be removed/commented
                 // This logic depends on context, reasonable to keep here
                if (businessData.services && businessData.services.length > 0) {
                    // Map and decode service names using the NEW helper
                    const serviceNames = businessData.services.map(s => `• ${decodeHtmlEntities(s.name)}`).join('\n'); // USE NEW FUNCTION
                    responsePayload = {
                        type: 'SERVICE_LIST',
                        response: RESPONSE_TEMPLATES.service_list_prefix + serviceNames + RESPONSE_TEMPLATES.service_list_suffix
                    };
                } else {
                     // Fallback to AI if no services defined
                     // Pass businessData to the fallback function
                     responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
                }
                break;

            case 'APPOINTMENT_REQUEST':
                // Let AI generate the response, but prepend a tip about no live calendar
                const aiAppointmentResponse = await generateAIFallbackResponse(message, messageHistory, businessData);
                aiAppointmentResponse.response = `Just so you know, I don't have access to a live calendar to confirm real-time availability. However, I can arrange for our team to call you and finalize your appointment.\n\n${aiAppointmentResponse.response}`;
                responsePayload = {
                    type: 'APPOINTMENT_REQUEST',
                    response: aiAppointmentResponse.response
                };
                break;

            case 'OPERATING_HOURS_INQUIRY':
                // console.log('[generateAIResponse] Matched case: OPERATING_HOURS_INQUIRY'); // To be removed/commented
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
                // console.log('[generateAIResponse] Matched case: SERVICE_FAQ'); // To be removed/commented
                // ... existing code ...
                console.warn('[generateAIResponse] SERVICE_FAQ case hit but no specific handler implemented yet. Falling back to AI.');
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
                break;

            case 'UNKNOWN':
            default:
                // console.log('[generateAIResponse] Matched case: UNKNOWN/default - Calling AI Fallback'); // To be removed/commented
                // Pass businessData to the fallback function
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData);
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
