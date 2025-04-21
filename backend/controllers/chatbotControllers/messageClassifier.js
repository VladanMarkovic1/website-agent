import { GREETINGS, DENTAL_PROBLEMS, URGENT_KEYWORDS } from './chatbotConstants.js';
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

    // 1. Check for Contact Info Provided (Highest priority)
    const contactInfo = extractContactInfo(message);
    if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
        console.log('[Classifier] Found contact info. Classifying as CONTACT_INFO_PROVIDED.');
        return {
            type: 'CONTACT_INFO_PROVIDED',
            contactInfo
        };
    }

    // 2. Check for Urgency (High priority)
    if (URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found urgency keyword. Classifying as URGENT_APPOINTMENT_REQUEST.');
        return { type: 'URGENT_APPOINTMENT_REQUEST' };
    }

    // 3. Check for Availability Keywords 
    if (availabilityKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found availability keyword. Classifying as APPOINTMENT_REQUEST.');
        return { type: 'APPOINTMENT_REQUEST' };
    }

    // 4. Check for General Appointment Keywords
    if (appointmentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found general appointment keyword. Classifying as APPOINTMENT_REQUEST.');
        return { type: 'APPOINTMENT_REQUEST' };
    }
    
    // 5. Check for Request to List Services
    if (listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found list service keyword. Classifying as REQUEST_SERVICE_LIST.');
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    // 6. Check for Simple Confirmations (after specific prompts)
    if (lastBotMessage && ('yes' === normalizedMessage || 'sure' === normalizedMessage || 'okay' === normalizedMessage || 'ok' === normalizedMessage)) {
        const requiredContact = lastBotMessage.content.includes('name, phone number, and email');
        const askedConfirmation = lastBotMessage.content.includes('Would you like') || 
                                  lastBotMessage.content.includes('shall I help') || 
                                  lastBotMessage.content.includes('arrange that');

        if (askedConfirmation && !requiredContact) {
            console.log('[Classifier] Found confirmation. Classifying as CONFIRMATION_YES.');
            return { type: 'CONFIRMATION_YES' };
        }
    }

    // 7. Check for Explicit Service Inquiry Keywords
    if (serviceInquiryKeywords.some(kw => normalizedMessage.includes(kw))) {
        console.log('[Classifier] Found explicit service keyword. Classifying as SERVICE_INQUIRY_EXPLICIT.');
        return { type: 'SERVICE_INQUIRY_EXPLICIT' };
    }

    // 8. Check for Follow-up after Dental Problem
    if (lastBotMessage?.type === 'DENTAL_PROBLEM' && 
        (normalizedMessage.includes('which service') || normalizedMessage.includes('what service') || 
         normalizedMessage.includes('can help') || normalizedMessage.includes('what should i do'))) {
        console.log('[Classifier] Found problem followup. Classifying as PROBLEM_FOLLOWUP.');
        return {
            type: 'PROBLEM_FOLLOWUP',
            problemCategory: lastBotMessage.problemCategory 
        };
    }

    // 9. Check for Initial Dental Problem Report
    const dentalProblem = isDentalProblem(normalizedMessage);
    if (dentalProblem.isIssue) {
        console.log('[Classifier] Found dental problem. Classifying as DENTAL_PROBLEM.');
        return {
            type: 'DENTAL_PROBLEM',
            category: dentalProblem.category,
            severity: dentalProblem.severity
        };
    }

    // 10. Check for Greetings (Only based on content, not isNewSession)
    if (isGreeting(normalizedMessage)) {
        console.log('[Classifier] Found greeting content. Classifying as GREETING.');
        return { type: 'GREETING' };
    }

    // 11. If none of the above, classify as Unknown
    console.log('[Classifier] No specific intent matched. Classifying as UNKNOWN.');
    return { type: 'UNKNOWN' };
}; 