import { GREETINGS, DENTAL_PROBLEMS } from './chatbotConstants.js';
import { extractContactInfo } from './extractContactInfo.js';

const isGreeting = (normalizedMsg) => {
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && normalizedMsg.length < 20;
};

const isDentalProblem = (normalizedMsg) => {
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isIssue: true,
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    return { isIssue: false };
};

// Keywords indicating a request to list available services
const listServiceKeywords = [
    'list services', 'what services', 'which services', 'do you offer', 'your services',
    'list service', 'what service', 'which service'
];

// Keywords indicating potential service inquiry
const serviceInquiryKeywords = ['interested in', 'about', 'want'];

/**
 * Classifies the user's message intent based on keywords and context.
 * 
 * @param {string} message - The user's current message.
 * @param {Array} messageHistory - The conversation history.
 * @param {Array} services - List of available business services.
 * @param {boolean} isNewSession - Flag indicating if this is the first message.
 * @returns {Object} An object with 'type' and optional context (e.g., category, contactInfo).
 */
export const classifyUserIntent = (message, messageHistory = [], services = [], isNewSession = false) => {
    const normalizedMessage = message.toLowerCase().trim();
    const lastBotMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();

    // 1. Check for Contact Info Provided
    const contactInfo = extractContactInfo(message);
    if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
        return {
            type: 'CONTACT_INFO_PROVIDED',
            contactInfo
        };
    }

    // 2. Check for Simple Confirmations (after specific prompts)
    if (lastBotMessage && ('yes' === normalizedMessage || 'sure' === normalizedMessage || 'okay' === normalizedMessage || 'ok' === normalizedMessage)) {
        const requiredContact = lastBotMessage.content.includes('name, phone number, and email');
        const askedConfirmation = lastBotMessage.content.includes('Would you like') || 
                                  lastBotMessage.content.includes('shall I help') || 
                                  lastBotMessage.content.includes('arrange that');

        if (askedConfirmation && !requiredContact) {
            return { type: 'CONFIRMATION_YES' };
        }
    }

    // 3. Check for Explicit Service Inquiry Keywords
    if (serviceInquiryKeywords.some(kw => normalizedMessage.includes(kw))) {
        // Let openaiService handle the actual matching via handleServiceInquiry
        return { type: 'SERVICE_INQUIRY_EXPLICIT' };
    }

    // 4. Check for Follow-up after Dental Problem
    if (lastBotMessage?.type === 'DENTAL_PROBLEM' && 
        (normalizedMessage.includes('which service') || normalizedMessage.includes('what service') || 
         normalizedMessage.includes('can help') || normalizedMessage.includes('what should i do'))) {
        return {
            type: 'PROBLEM_FOLLOWUP',
            problemCategory: lastBotMessage.problemCategory 
        };
    }

    // 5. Check for Initial Dental Problem Report
    const dentalProblem = isDentalProblem(normalizedMessage);
    if (dentalProblem.isIssue) {
        return {
            type: 'DENTAL_PROBLEM',
            category: dentalProblem.category,
            severity: dentalProblem.severity
        };
    }

    // 6. Check for Request to List Services (Moved BEFORE Greeting)
    if (listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    // 7. Check for Greetings (Moved AFTER Request Service List)
    if (isNewSession || isGreeting(normalizedMessage)) {
        return { type: 'GREETING' };
    }

    // 8. If none of the above, classify as Unknown (will trigger OpenAI fallback)
    return { type: 'UNKNOWN' };
}; 