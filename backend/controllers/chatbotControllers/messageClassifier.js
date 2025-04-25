import { GREETINGS, DENTAL_PROBLEMS, URGENT_KEYWORDS, RESPONSE_TEMPLATES, SERVICE_FAQ_KEYWORDS, OPERATING_HOURS_KEYWORDS, RESCHEDULE_KEYWORDS, CANCEL_KEYWORDS, CONFIRMATION_KEYWORDS } from './chatbotConstants.js';
import { extractContactInfo } from './extractContactInfo.js';

const isGreeting = (normalizedMsg) => {
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && normalizedMsg.length < 20;
};

// Renamed from isDentalProblem to checkDentalProblem for clarity
const checkDentalProblem = (normalizedMsg) => {
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isProblem: true, // Changed from isIssue
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    return { isProblem: false }; // Changed from isIssue
};

// Keywords for Appointment Requests
const appointmentKeywords = [
    'appointment', 'appointments', 'appoinment', 'book', 'schedule', 'check in', 'check availability',
    'see the doctor', 'see dr', 'make an appointment'
];

// Keywords for Availability Inquiries (Higher Priority than List Services)
const availabilityKeywords = [
    'weekend', 'saturday', 'sunday', 
    'noon', 'afternoon', 'evening', 'morning',
    'hours', 'available', 'availability', 'when',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'time',
    // Add common misspellings if needed, e.g., 'appoinment', 'appointmet'
];

// Keywords indicating a request to list available services
const listServiceKeywords = [
    'list services', 'what services', 'which services', 'do you offer', 'your services',
    'list service', 'what service', 'which service'
];

// Keywords indicating potential service inquiry
const serviceInquiryKeywords = ['interested in', 'about', 'want'];

// Helper function to find a matching service name in the message
// (More robust matching might be needed depending on service name complexity)
export const findServiceNameInMessage = (normalizedMsg, services = []) => {
    if (!services || services.length === 0) return null;
    // Find the first service whose name appears in the message
    const foundService = services.find(service => 
        service.name && normalizedMsg.includes(service.name.toLowerCase())
    );
    return foundService ? foundService.name : null;
};

// Helper function to determine the type of question asked
const getQuestionType = (normalizedMsg) => {
    if (SERVICE_FAQ_KEYWORDS.pain.some(kw => normalizedMsg.includes(kw))) return 'pain';
    if (SERVICE_FAQ_KEYWORDS.duration.some(kw => normalizedMsg.includes(kw))) return 'duration';
    if (SERVICE_FAQ_KEYWORDS.cost.some(kw => normalizedMsg.includes(kw))) return 'cost';
    return 'details'; // Default if specific keywords not found but pattern matches
};

// Helper function to check if the message is a Service FAQ
const checkServiceFAQ = (normalizedMsg, services) => {
    const mentionedServiceName = findServiceNameInMessage(normalizedMsg, services);
    if (!mentionedServiceName) return null; // No service mentioned

    // Combine all FAQ keywords
    const questionKeywords = [
        ...SERVICE_FAQ_KEYWORDS.pain, 
        ...SERVICE_FAQ_KEYWORDS.duration, 
        ...SERVICE_FAQ_KEYWORDS.cost
    ];

    // Check if the message contains any of the FAQ keywords
    const isFAQ = questionKeywords.some(kw => normalizedMsg.includes(kw));

    if (isFAQ) {
        const questionType = getQuestionType(normalizedMsg); // Determine specific type
        return { serviceName: mentionedServiceName, questionType: questionType };
    }
    
    return null; // Not an FAQ
};

// Helper to check if a bot message requests contact info
const didBotRequestContactInfo = (botMessageContent) => {
    if (!botMessageContent) return false;
    const lowerContent = botMessageContent.toLowerCase();
    
    // Relaxed check: Does it mention any contact field AND use requesting language?
    const mentionsName = lowerContent.includes('name');
    const mentionsPhone = lowerContent.includes('phone');
    const mentionsEmail = lowerContent.includes('email');
    const asksForInfo = lowerContent.includes('provide') || 
                        lowerContent.includes('share') || 
                        lowerContent.includes('could you') || 
                        lowerContent.includes('what is') || 
                        lowerContent.includes('?'); // Check for question mark

    // Require at least one contact field mention and requesting language
    return (mentionsName || mentionsPhone || mentionsEmail) && asksForInfo;

    // Old stricter check:
    // const requestsName = lowerContent.includes('name');
    // const requestsPhone = lowerContent.includes('phone');
    // const requestsEmail = lowerContent.includes('email');
    // return requestsName && requestsPhone && requestsEmail;
};

/**
 * Classifies the user's message intent based on keywords and context.
 * 
 * @param {string} message - The user's current message.
 * @param {Array} messageHistory - The conversation history.
 * @param {Array} services - List of available business services.
 * @param {boolean} isNewSession - Flag indicating if this is the first message.
 * @param {Object} previousPartialInfo - Optional previously collected partial info { name, phone, email }.
 * @returns {Object} An object with 'type' and optional context (e.g., category, contactInfo, missingFields).
 */
export const classifyUserIntent = (message, messageHistory, services = [], isNewSession = false, previousPartialInfo = null) => {
    const normalizedMessage = message.toLowerCase().trim();
    const lastBotMessage = messageHistory.slice().reverse().find(msg => msg.role === 'assistant');

    // Check if the bot just asked for contact info
    const botRequestedContact = lastBotMessage && 
                              (lastBotMessage.type === 'CONTACT_REQUEST' || 
                               lastBotMessage.type === 'PARTIAL_CONTACT_REQUEST' ||
                               lastBotMessage.type === 'PEDIATRIC_ADVICE_REQUEST' || // Added this type
                               lastBotMessage.type === 'SPECIFIC_ADVICE_REQUEST' ||
                               lastBotMessage.type === 'SPECIFIC_SERVICE_REQUEST' ||
                               lastBotMessage.type === 'BOOKING_SPECIFIC_SERVICE' || // Added this type
                               lastBotMessage.type === 'BOOKING_REQUEST');

    if (botRequestedContact) {
        // Accumulate contact info from history AFTER the bot's request
        let finalAccumulatedInfo = { ...(previousPartialInfo || {}) };
        let extractedSomethingThisTurn = false;
        
        // Look back only a few messages or until the bot request
        const historyToCheck = [];
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            if (messageHistory[i].role === 'assistant' && 
                (messageHistory[i].type === 'CONTACT_REQUEST' || messageHistory[i].type === 'PARTIAL_CONTACT_REQUEST' || messageHistory[i].type === 'PEDIATRIC_ADVICE_REQUEST' || messageHistory[i].type === 'SPECIFIC_ADVICE_REQUEST' || messageHistory[i].type === 'SPECIFIC_SERVICE_REQUEST' || messageHistory[i].type === 'BOOKING_SPECIFIC_SERVICE' || messageHistory[i].type === 'BOOKING_REQUEST')) {
                break; // Stop when we hit the relevant bot request
            }
            if (messageHistory[i].role === 'user') {
                 historyToCheck.unshift(messageHistory[i]); // Add user messages in order
            }
        }
        // Add the current message to check as well
        historyToCheck.push({ role: 'user', content: message });

        historyToCheck.forEach(userMsg => {
            const extractedFromMsg = extractContactInfo(userMsg.content);
            if (extractedFromMsg) {
                // Merge ONLY IF new info is found in this message
                let merged = false;
                if (extractedFromMsg.name && !finalAccumulatedInfo.name) { finalAccumulatedInfo.name = extractedFromMsg.name; merged = true; }
                if (extractedFromMsg.phone && !finalAccumulatedInfo.phone) { finalAccumulatedInfo.phone = extractedFromMsg.phone; merged = true; }
                if (extractedFromMsg.email && !finalAccumulatedInfo.email) { finalAccumulatedInfo.email = extractedFromMsg.email; merged = true; }
                
                if(merged) {
                     extractedSomethingThisTurn = true; // Mark that we found something new
                }
            }
        });

        // Check if accumulated info is now complete
        if (finalAccumulatedInfo.name && finalAccumulatedInfo.phone && finalAccumulatedInfo.email) {
            return {
                type: 'CONTACT_INFO_PROVIDED',
                contactInfo: finalAccumulatedInfo,
                service: findServiceNameInMessage(message, services) // Check current message for service
            };
        } 
        // If we extracted *something* relevant in this turn (or had previous partial), and it's still not complete
        else if (extractedSomethingThisTurn || (previousPartialInfo && (previousPartialInfo.name || previousPartialInfo.phone || previousPartialInfo.email))) { 
             const missingFields = [];
             if (!finalAccumulatedInfo.name) missingFields.push('name');
             if (!finalAccumulatedInfo.phone) missingFields.push('phone');
             if (!finalAccumulatedInfo.email) missingFields.push('email');
             return {
                 type: 'PARTIAL_CONTACT_INFO_PROVIDED',
                 contactInfo: finalAccumulatedInfo, // Pass back the latest accumulated info
                 missingFields: missingFields 
             };
        }
    }

    // Check for complete contact info in the current message ONLY if bot didn't just ask
    const singleMessageContactInfo = extractContactInfo(message);
    if (singleMessageContactInfo && singleMessageContactInfo.name && singleMessageContactInfo.phone && singleMessageContactInfo.email) {
        return {
            type: 'CONTACT_INFO_PROVIDED',
            contactInfo: singleMessageContactInfo,
            service: findServiceNameInMessage(message, services)
        };
    }

    // --- Other Intent Checks (Prioritize more specific intents) ---
    if (URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'URGENT_APPOINTMENT_REQUEST' };
    }

    if (OPERATING_HOURS_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'OPERATING_HOURS_INQUIRY' };
    }

     if (RESCHEDULE_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'RESCHEDULE_REQUEST' };
    }

     if (CANCEL_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'CANCEL_REQUEST' };
    }
    
    if (availabilityKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'APPOINTMENT_REQUEST' }; 
    }

    if (appointmentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'APPOINTMENT_REQUEST' };
    }

    if (listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    const faqMatch = checkServiceFAQ(normalizedMessage, services);
    if (faqMatch) {
        return { type: 'SERVICE_FAQ', serviceName: faqMatch.serviceName, questionType: faqMatch.questionType };
    }

    // Check for confirmation keywords ONLY if the bot didn't just ask for contact
    if (!botRequestedContact && CONFIRMATION_KEYWORDS.some(keyword => normalizedMessage.startsWith(keyword) || normalizedMessage.endsWith(keyword))) {
        return { type: 'CONFIRMATION_YES' };
    }

    // Check for explicit service keywords
    if (serviceInquiryKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'SERVICE_INQUIRY_EXPLICIT' };
    }

    // Check for Dental Problems
    const problemCheck = checkDentalProblem(normalizedMessage);
    if (problemCheck.isProblem) {
        return {
            type: 'DENTAL_PROBLEM',
            category: problemCheck.category,
            severity: problemCheck.severity
        };
    }

    // Check for Greeting
    if (GREETINGS.some(greeting => normalizedMessage.startsWith(greeting))) {
        return { type: 'GREETING' };
    }

    // Fallback
    return { type: 'UNKNOWN' };
}; 