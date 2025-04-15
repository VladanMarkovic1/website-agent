// import OpenAI from "openai"; // No longer needed here
import dotenv from "dotenv";
import { classifyUserIntent } from "./messageClassifier.js";
import { handleServiceInquiry } from "./serviceMatcher.js";
import { generateAIFallbackResponse } from "./aiFallbackService.js";
import {
    // CHATBOT_PERSONALITY, // Not needed directly here anymore
    RESPONSE_TEMPLATES,
    DENTAL_PROBLEMS // Still needed for PROBLEM_FOLLOWUP logic
} from "./chatbotConstants.js";

dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Moved to aiFallbackService

// Removed handleServiceInquiry (moved to serviceMatcher.js)
// Removed _generateOpenAIFallback (moved to aiFallbackService.js)

// --- Main Exported Function (Orchestrator) --- 

export const generateAIResponse = async (message, businessData, messageHistory = [], isNewSession = false) => {
    try {
        console.log('--- generateAIResponse Orchestrator Start ---');
        console.log('User Message:', message);
        const lastBotMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();
        const normalizedMessage = message.toLowerCase().trim(); // Normalize once here

        // 1. Classify Intent
        const intent = classifyUserIntent(message, messageHistory, businessData.services, isNewSession);
        console.log('Classified Intent:', JSON.stringify(intent));

        let responsePayload = {};

        // 2. Handle Intent based on Classification
        switch (intent.type) {
            case 'CONTACT_INFO_PROVIDED':
                // This logic seems self-contained enough to stay here
                const serviceContext = intent.contactInfo.service || lastBotMessage?.detectedService || 'your dental needs';
                const businessPhoneNumber = businessData?.businessPhoneNumber;
                const callUsText = businessPhoneNumber
                    ? `please feel free to call us directly at ${businessPhoneNumber}.`
                    : `please feel free to call us directly (phone number available on our website).`;
                responsePayload = {
                    type: 'CONTACT_INFO',
                    response: 
                        `✅ Thank you, ${intent.contactInfo.name}! Your information has been received, and we've noted your interest in ${serviceContext}.\n\n` +
                        `🧑‍⚕️ Our team will contact you at ${intent.contactInfo.phone} shortly during business hours to discuss your needs and schedule your consultation.\n\n` +
                        `📞 If your situation requires immediate attention or you prefer to speak with us sooner, ${callUsText}`,
                    contactInfo: intent.contactInfo,
                    serviceContext
                };
                break;

            case 'CONFIRMATION_YES':
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: RESPONSE_TEMPLATES.contact_after_yes
                };
                break;

            case 'SERVICE_INQUIRY_EXPLICIT':
                // Call the dedicated service matcher
                const matchedService = await handleServiceInquiry(normalizedMessage, businessData);
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
                    console.log('Explicit inquiry keywords but no specific service match. Falling back to AI.');
                    responsePayload = await generateAIFallbackResponse(message, messageHistory);
                }
                break;
            
            case 'PROBLEM_FOLLOWUP':
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
                 // This logic depends on constants and context, reasonable to keep here
                let responseTemplate;
                let concernDetail = intent.category;
                if (intent.severity === 'high') {
                    responseTemplate = RESPONSE_TEMPLATES.emergency;
                } else if (intent.category === 'appearance') {
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
                    responseTemplate = RESPONSE_TEMPLATES.dental_problem;
                }
                responsePayload = {
                    type: 'DENTAL_PROBLEM',
                    response: typeof responseTemplate === 'function' ? responseTemplate(concernDetail) : responseTemplate,
                    problemCategory: intent.category,
                    severity: intent.severity
                };
                break;

            case 'GREETING':
                responsePayload = {
                    type: 'GREETING',
                    response: RESPONSE_TEMPLATES.greeting
                };
                break;

            case 'REQUEST_SERVICE_LIST':
                 // This logic depends on context, reasonable to keep here
                if (businessData.services && businessData.services.length > 0) {
                    const serviceNames = businessData.services.map(s => `• ${s.name}`).join('\n');
                    responsePayload = {
                        type: 'SERVICE_LIST',
                        response: RESPONSE_TEMPLATES.service_list_prefix + serviceNames + RESPONSE_TEMPLATES.service_list_suffix
                    };
                } else {
                     // Fallback to AI if no services defined
                     responsePayload = await generateAIFallbackResponse(message, messageHistory);
                }
                break;

            case 'UNKNOWN':
            default:
                // Fallback to AI for anything not classified
                responsePayload = await generateAIFallbackResponse(message, messageHistory);
                break;
        }

        console.log('--- generateAIResponse Orchestrator End ---');
        // Ensure payload always has type and response, pass through context
        return {
            type: responsePayload.type || 'ERROR',
            response: responsePayload.response || RESPONSE_TEMPLATES.error_fallback,
            contactInfo: responsePayload.contactInfo || null, 
            serviceContext: responsePayload.serviceContext || null, 
            problemCategory: responsePayload.problemCategory || null 
        };

    } catch (error) {
        console.error("Error in generateAIResponse orchestrator:", error);
        return {
            type: 'ERROR',
            response: RESPONSE_TEMPLATES.error_fallback
        };
    }
};
