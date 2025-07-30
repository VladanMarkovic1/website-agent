// import OpenAI from "openai"; // No longer needed here
import dotenv from "dotenv";
import { classifyUserIntent, findServiceNameInMessage } from "./messageClassifier.js";
import { handleServiceInquiry } from "./serviceMatcher.js";
import { generateAIFallbackResponse } from "./aiFallbackService.js";
// Removed import of deleted constants
import { extractContactInfo } from "./extractContactInfo.js"; // Only import extractContactInfo
import { redactPII } from '../../utils/piiFilter.js'; // Added this import

dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Moved to aiFallbackService

// Removed handleServiceInquiry (moved to serviceMatcher.js)
// Removed _generateOpenAIFallback (moved to aiFallbackService.js)

// Simple response templates to replace deleted constants
const RESPONSE_TEMPLATES = {
    contact_after_yes: "😃 Great! I can help you schedule a consultation.",
    problem_followup_prefix: (category) => `🦷 I understand you're experiencing ${category}. Here are some services that might help:\n\n`,
    problem_followup_suffix: "\n\nI'd be happy to help you learn more about these treatments.",
    problem_followup_fallback: (category) => `🦷 I understand you're experiencing ${category}. We can help diagnose and treat this issue.`,
    emergency: "🚨 This sounds like it might need immediate attention. Please call us right away for emergency care.",
    visual_concern: "✨ I understand you're concerned about the appearance of your teeth. Our cosmetic dentistry services can help improve your smile with whitening, veneers, and other treatments.",
    acknowledge_symptom: (symptom) => `🦷 I understand you're experiencing ${symptom}. We can help diagnose and treat this properly.`,
    service_list_prefix: "🦷 Here are the services we offer:\n\n",
    service_list_suffix: "\n\nI'd be happy to tell you more about any of these services.",
    error_fallback: "😔 I apologize, but I'm having trouble processing your request right now. Please try again or call us directly.",
    OPERATING_HOURS_RESPONSE: (hours) => `🕒 Our operating hours are:\n${hours}`,
    HOURS_UNAVAILABLE_FALLBACK: "🕒 I don't have our current operating hours available. Please call us directly."
};

// Simple dental problems mapping to replace deleted constants
const DENTAL_PROBLEMS = {
    appearance: ['cosmetic', 'appearance', 'look', 'smile', 'teeth', 'whitening', 'straighten'],
    pain: ['pain', 'hurt', 'ache', 'sore', 'discomfort'],
    damage: ['broken', 'cracked', 'chipped', 'damaged', 'fractured'],
    sensitivity: ['sensitive', 'sensitivity', 'cold', 'hot', 'temperature'],
    emergency: ['emergency', 'urgent', 'severe', 'extreme']
};

// Simple time preference keywords to replace deleted constants
const TIME_PREFERENCE_KEYWORDS = ['morning', 'afternoon', 'evening', 'weekend', 'saturday', 'sunday', 'today', 'tomorrow', 'asap', 'soon'];

// Restore local definition of createMissingInfoPrompt
const createMissingInfoPrompt = (missingFields, providedInfo, language = 'en') => {
    let prompt = "";
    
    // Multilingual responses
    const responses = {
        en: {
            namePhoneNoEmail: `Thanks, ${providedInfo.name}! Got your phone number. Could you also provide your email address?`,
            nameEmailNoPhone: `Thanks, ${providedInfo.name}! Got your email. Could you also provide your phone number?`,
            phoneEmailNoName: `Got your phone and email! Could you please provide your full name too?`,
            nameNoPhoneNoEmail: `Thanks, ${providedInfo.name}! Could you also share your phone number and email address?`,
            phoneNoNameNoEmail: `Got your phone number! Could you also share your name and email address?`,
            emailNoNameNoPhone: `Got your email address! Could you also share your name and phone number?`
        },
        es: {
            namePhoneNoEmail: `¡Gracias, ${providedInfo.name}! Obtuvimos tu número de teléfono. ¿Podrías también proporcionar tu dirección de correo electrónico?`,
            nameEmailNoPhone: `¡Gracias, ${providedInfo.name}! Obtuvimos tu correo electrónico. ¿Podrías también proporcionar tu número de teléfono?`,
            phoneEmailNoName: `¡Obtuvimos tu teléfono y correo electrónico! ¿Podrías proporcionar tu nombre completo también?`,
            nameNoPhoneNoEmail: `¡Gracias, ${providedInfo.name}! ¿Podrías también compartir tu número de teléfono y dirección de correo electrónico?`,
            phoneNoNameNoEmail: `¡Obtuvimos tu número de teléfono! ¿Podrías también compartir tu nombre y dirección de correo electrónico?`,
            emailNoNameNoPhone: `¡Obtuvimos tu dirección de correo electrónico! ¿Podrías también compartir tu nombre y número de teléfono?`
        },
        it: {
            namePhoneNoEmail: `Grazie, ${providedInfo.name}! Abbiamo il tuo numero di telefono. Potresti anche fornire il tuo indirizzo email?`,
            nameEmailNoPhone: `Grazie, ${providedInfo.name}! Abbiamo la tua email. Potresti anche fornire il tuo numero di telefono?`,
            phoneEmailNoName: `Abbiamo il tuo telefono ed email! Potresti fornire anche il tuo nome completo?`,
            nameNoPhoneNoEmail: `Grazie, ${providedInfo.name}! Potresti anche condividere il tuo numero di telefono e indirizzo email?`,
            phoneNoNameNoEmail: `Abbiamo il tuo numero di telefono! Potresti anche condividere il tuo nome e indirizzo email?`,
            emailNoNameNoPhone: `Abbiamo il tuo indirizzo email! Potresti anche condividere il tuo nome e numero di telefono?`
        }
    };
    
    // Get the appropriate language responses, fallback to English
    const langResponses = responses[language] || responses.en;
    
    if (providedInfo.name && providedInfo.phone && !providedInfo.email) {
        prompt = langResponses.namePhoneNoEmail;
    } else if (providedInfo.name && !providedInfo.phone && providedInfo.email) {
        prompt = langResponses.nameEmailNoPhone;
    } else if (!providedInfo.name && providedInfo.phone && providedInfo.email) {
        prompt = langResponses.phoneEmailNoName;
    } else if (providedInfo.name && !providedInfo.phone && !providedInfo.email) {
        prompt = langResponses.nameNoPhoneNoEmail;
    } else if (!providedInfo.name && providedInfo.phone && !providedInfo.email) {
        prompt = langResponses.phoneNoNameNoEmail;
    } else if (!providedInfo.name && !providedInfo.phone && providedInfo.email) {
        prompt = langResponses.emailNoNameNoPhone;
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

export const generateAIResponse = async (message, businessData, messageHistory = [], isNewSession = false, previousPartialInfo = { name: null, phone: null, email: null }, sessionServiceInterest = null, language = 'en') => {
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
                
                // Use phone/email from businessData (dashboard)
                const confirmationPrefix = `✅ Thank you, ${contactInfo.name}! We've received your information for ${determinedServiceContext}.`;
                const scheduleSuffix = ` 📞 Our team will call you at ${contactInfo.phone} soon.`;
                // Use dashboard phone/email for callUsSuffix
                let callUsSuffix = '';
                if (businessData.phone) {
                    callUsSuffix += ` Need immediate help? Call ${businessData.phone}.`;
                }
                if (businessData.email) {
                    callUsSuffix += ` Or email ${businessData.email}.`;
                }
               // console.log('[DEBUG][openaiService.js] Using contact info in response:', { phone: businessData.phone, email: businessData.email });
                responsePayload = {
                    type: 'CONTACT_INFO',
                    response: confirmationPrefix + scheduleSuffix + callUsSuffix,
                    contactInfo: contactInfo,
                    serviceContext: determinedServiceContext
                };
                break;

            case 'PARTIAL_CONTACT_INFO_PROVIDED':
                // console.log('[generateAIResponse] Matched case: PARTIAL_CONTACT_INFO_PROVIDED'); // To be removed/commented
                responsePayload = {
                    type: 'PARTIAL_CONTACT_REQUEST', // Indicate bot is asking for more
                    response: createMissingInfoPrompt(intent.missingFields, intent.contactInfo, language),
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
                    responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                    break;
                }
                // Otherwise, call the dedicated service matcher
                const matchedService = await handleServiceInquiry(normalizedMessage, businessData.services);
                if (matchedService) {
                    // Provide service information first, then ask for contact info
                    const serviceDescription = decodeHtmlEntities(matchedService.description) || 
                        `${decodeHtmlEntities(matchedService.name)} is one of our specialized dental services`;
                    responsePayload = {
                        type: 'CONTACT_REQUEST',
                        detectedService: decodeHtmlEntities(matchedService.name),
                        serviceContext: decodeHtmlEntities(matchedService.name),
                        response: serviceDescription
                    };
                } else {
                    // Fallback to AI if explicit inquiry but no match
                    // console.log('Explicit inquiry keywords but no specific service match. Falling back to AI.'); // To be removed/commented
                    // Pass businessData to the fallback function
                    responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                }
                break;
            
            case 'PROBLEM_FOLLOWUP':
                // console.log('[generateAIResponse] Matched case: PROBLEM_FOLLOWUP'); // To be removed/commented
                // Provide helpful information about the problem, then ask for contact info
                const problemCategory = intent.problemCategory;
                let problemInfo = '';
                
                if (problemCategory === 'damage') {
                    problemInfo = "We can repair damaged teeth with crowns, bonding, or veneers depending on the severity.";
                } else if (problemCategory === 'pain') {
                    problemInfo = "Dental pain can indicate various issues from cavities to infections. We'll diagnose and treat the root cause.";
                } else if (problemCategory === 'sensitivity') {
                    problemInfo = "Tooth sensitivity can be treated with desensitizing agents, fillings, or other restorative procedures.";
                } else {
                    problemInfo = "We can help diagnose and treat your dental concern with our comprehensive services.";
                }
                
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: problemInfo
                };
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
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                break;

            case 'HELP_REQUEST':
                // For help requests, use AI to provide natural, helpful responses
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                break;

            case 'SERVICE_INTEREST':
                // For general service interest, provide value first, then ask for contact info
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: "We offer comprehensive dental services including cosmetic dentistry, preventive care, and emergency treatments."
                };
                break;

            case 'REQUEST_SERVICE_LIST':
                // console.log('[generateAIResponse] Matched case: REQUEST_SERVICE_LIST'); // To be removed/commented
                // Provide brief service overview, then ask for contact info
                let serviceOverview = "We offer comprehensive dental services including preventive care, cosmetic dentistry, restorative treatments, and emergency care.";
                
                if (businessData.services && businessData.services.length > 0) {
                    const serviceNames = businessData.services.slice(0, 3).map(s => decodeHtmlEntities(s.name)).join(', ');
                    serviceOverview = `Our services include ${serviceNames} and more.`;
                }
                
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    response: serviceOverview
                };
                break;

            case 'APPOINTMENT_REQUEST':
                // Always prepend the tip, then add the AI/template response
                const tip = "I don't have access to a live calendar, but I can arrange for our team to call you.\n\n";
                const aiAppointmentResponse = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                const aiText = aiAppointmentResponse.response || "";
                responsePayload = {
                    type: 'APPOINTMENT_REQUEST',
                    response: tip + aiText
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
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                break;

            case 'PAYMENT_PLAN_INQUIRY':
                // Determine if the user is asking about insurance or payment plans specifically
                let insuranceMsg = '';
                let paymentMsg = '';
                if (businessData.insurancePartners && businessData.insurancePartners.length > 0) {
                    insuranceMsg = `Insurance providers: ${businessData.insurancePartners.join(', ')}.`;
                }
                if (businessData.paymentOptions && businessData.paymentOptions.length > 0) {
                    paymentMsg = `Payment plans/options: ${businessData.paymentOptions.join(', ')}.`;
                }
                let responseText = '';
                // Check the message or intent for keywords
                const lowerMsg = message.toLowerCase();
                if (lowerMsg.includes('insurance')) {
                    responseText = insuranceMsg || 'No specific insurance information is available.';
                } else if (lowerMsg.includes('payment')) {
                    responseText = paymentMsg || 'No specific payment plan information is available.';
                } else {
                    // Fallback: show both if not clear
                    if (insuranceMsg && paymentMsg) {
                        responseText = `${insuranceMsg} ${paymentMsg}`;
                    } else if (insuranceMsg) {
                        responseText = insuranceMsg;
                    } else if (paymentMsg) {
                        responseText = paymentMsg;
                    } else {
                        responseText = 'No specific insurance or payment plan information is available.';
                    }
                }
                responsePayload = {
                    type: 'PAYMENT_PLAN_INQUIRY',
                    response: responseText
                };
                break;

            case 'CONTACT_INQUIRY':
            case 'VISIT_INQUIRY':
                let contactDetails = [];
                if (businessData.phone) {
                    contactDetails.push(`Phone: ${businessData.phone}`);
                }
                if (businessData.email) {
                    contactDetails.push(`Email: ${businessData.email}`);
                }
                if (businessData.address) {
                    let address = businessData.address;
                    if (businessData.city) address += `, ${businessData.city}`;
                    if (businessData.state) address += `, ${businessData.state}`;
                    if (businessData.zipCode) address += ` ${businessData.zipCode}`;
                    contactDetails.push(`Address: ${address}`);
                }
                
                if (contactDetails.length > 0) {
                    responsePayload = {
                        type: 'CONTACT_INQUIRY',
                        response: `📞 You can reach us at: ${contactDetails.join('. ')}. Feel free to call or email us with any questions!`
                    };
                } else {
                    responsePayload = {
                        type: 'CONTACT_INQUIRY',
                        response: "You can contact us through our website or call our office directly. We'd be happy to help you with any questions!"
                    };
                }
                break;

            case 'FACTUAL_QUESTION':
                // Use AI to answer factual questions, do NOT use a template or ask for contact info
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                break;

            case 'SERVICE_CONSULTATION_REQUEST':
                // Generate a focused, AI-powered response about the requested service, then ask for contact info
                const serviceName = intent.serviceName || 'the requested service';
                // Compose a prompt for the AI to answer specifically about the requested service
                const consultationPrompt = `A user is interested in ${serviceName}. Briefly and directly explain what ${serviceName} is, what it includes, and its benefits. Do NOT use empathy or concern language. Do NOT assume the user is worried or concerned. Do NOT mention other services. After providing value, invite the user to schedule a consultation by providing their name, phone number, and email address.`;
                const aiConsultationResponse = await generateAIFallbackResponse(consultationPrompt, messageHistory, businessData, language);
                responsePayload = {
                    type: 'CONTACT_REQUEST',
                    serviceContext: serviceName,
                    response: aiConsultationResponse.response
                };
                break;

            case 'TEAM_INQUIRY':
            case 'STAFF_INQUIRY':
            case 'ABOUT_INQUIRY': {
                // Try to use dashboard data for team/about
                let aboutText = '';
                if (businessData.team && Array.isArray(businessData.team) && businessData.team.length > 0) {
                    aboutText = 'Meet our team: ' + businessData.team.map(member => {
                        let str = member.name ? member.name : '';
                        if (member.title) str += `, ${member.title}`;
                        if (member.bio) str += `. ${member.bio}`;
                        if (member.experience) str += ` (${member.experience})`;
                        return str;
                    }).join(' | ');
                } else if (businessData.about) {
                    aboutText = businessData.about;
                } else if (businessData.businessDescription) {
                    aboutText = businessData.businessDescription;
                } else {
                    aboutText = 'We are a dedicated dental team committed to your oral health.';
                }
                responsePayload = {
                    type: 'ABOUT_INFO',
                    response: '👩‍⚕️ ' + aboutText
                };
                break;
            }

            case 'UNKNOWN':
            default:
                // console.log('[generateAIResponse] Matched case: UNKNOWN/default - Calling AI Fallback'); // To be removed/commented
                // Pass businessData to the fallback function
                responsePayload = await generateAIFallbackResponse(message, messageHistory, businessData, language);
                break;
        }
        // console.log('[generateAIResponse] Exiting switch, final responsePayload:', JSON.stringify(responsePayload)); // Potential PII - Removed

        // console.log('--- generateAIResponse Orchestrator End ---');
        // Before returning responsePayload at the end of generateAIResponse
        //console.log('[DEBUG][openaiService.js] Returning response:', responsePayload?.type, responsePayload?.response);

        // Always use gpt-3.5-turbo for fastest responses
        businessData.aiConfig = { ...businessData.aiConfig, model: 'gpt-3.5-turbo' };

        return {
            classifiedIntent: intent,
            responsePayload
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
