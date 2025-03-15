/**
 * Helper functions for managing conversation memory and context
 */

// Keywords for detecting different types of queries
const QUERY_KEYWORDS = {
    price: ['price', 'cost', 'expensive', 'affordable', 'payment', 'finance'],
    introduction: ['what is', 'tell me about', 'explain', 'introduce', 'learn about'],
    timeline: ['how long', 'duration', 'time', 'takes', 'process', 'steps'],
    booking: ['book', 'appointment', 'schedule', 'consultation', 'visit'],
    contact: ['email', 'phone', 'contact', 'reach', 'call']
};

/**
 * Detects the type of question being asked
 * @param {string} message - User's message
 * @returns {string|null} Question type or null if not detected
 */
export function detectQuestionType(message) {
    const lowercaseMsg = message.toLowerCase();
    
    for (const [type, keywords] of Object.entries(QUERY_KEYWORDS)) {
        if (keywords.some(keyword => lowercaseMsg.includes(keyword))) {
            return type;
        }
    }
    
    return null;
}

/**
 * Checks if message contains contact information
 * @param {string} message - User's message
 * @returns {Object|null} Extracted contact info or null
 */
export function extractContactInfo(message) {
    // Handle structured format (name: xxx, phone: xxx, email: xxx)
    const structuredMatch = {
        name: message.match(/name:\s*([^,]+)/i)?.[1],
        phone: message.match(/phone:\s*([^,]+)/i)?.[1],
        email: message.match(/email:\s*([^,]+)/i)?.[1]
    };

    if (structuredMatch.name && structuredMatch.phone && structuredMatch.email) {
        return structuredMatch;
    }

    // Handle natural format (name, phone, email)
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
    const phoneRegex = /(\d[\d\s-]{7,})/;
    const nameRegex = /([A-Z][a-z]+)/;

    const email = message.match(emailRegex)?.[1];
    const phone = message.match(phoneRegex)?.[1]?.replace(/\s+/g, '');
    const name = message.match(nameRegex)?.[1];

    if (email || phone || name) {
        return {
            email: email || null,
            phone: phone || null,
            name: name || null
        };
    }

    return null;
}

/**
 * Checks if the message is an affirmative response
 * @param {string} message - User's message
 * @returns {boolean} Whether message is affirmative
 */
export function isAffirmativeResponse(message) {
    const affirmativeResponses = [
        'yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup',
        'definitely', 'absolutely', 'of course', 'please'
    ];
    
    return affirmativeResponses.includes(message.toLowerCase().trim());
}

/**
 * Formats contact information for storage
 * @param {Object} contactInfo - Raw contact information
 * @returns {Object} Formatted contact information
 */
export function formatContactInfo(contactInfo) {
    return {
        name: contactInfo.name || null,
        email: contactInfo.email?.toLowerCase() || null,
        phone: contactInfo.phone?.replace(/[^0-9]/g, '') || null,
        timestamp: new Date().toISOString()
    };
}

/**
 * Checks if all required contact information is present
 * @param {Object} contactInfo - Contact information object
 * @returns {boolean} Whether all required fields are present
 */
export function hasCompleteContactInfo(contactInfo) {
    if (!contactInfo) return false;
    
    return Boolean(
        contactInfo.email?.trim() &&
        contactInfo.phone?.trim() &&
        contactInfo.name?.trim()
    );
}

/**
 * Gets missing contact fields
 * @param {Object} contactInfo - Contact information object
 * @returns {Array} List of missing fields
 */
export function getMissingContactFields(contactInfo) {
    const required = ['name', 'email', 'phone'];
    return required.filter(field => !contactInfo[field]);
}