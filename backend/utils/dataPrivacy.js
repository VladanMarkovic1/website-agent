/**
 * Data Privacy Utilities for Production API Responses
 * Masks sensitive information to comply with privacy regulations
 */

/**
 * Masks phone number - shows first 3 and last 2 digits
 * Example: +15551234567 → +155*****67
 */
export const maskPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return phoneNumber;
    }
    
    // Remove all non-digit characters for processing
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length < 5) {
        return '***-***-****'; // Too short to mask meaningfully
    }
    
    // For US numbers (+1XXXXXXXXXX)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        const areaCode = digitsOnly.substring(1, 4);
        const lastTwo = digitsOnly.substring(9, 11);
        return `+1(${areaCode})***-**${lastTwo}`;
    }
    
    // For 10-digit numbers
    if (digitsOnly.length === 10) {
        const areaCode = digitsOnly.substring(0, 3);
        const lastTwo = digitsOnly.substring(8, 10);
        return `(${areaCode})***-**${lastTwo}`;
    }
    
    // For other formats, show first 3 and last 2 digits
    const first3 = digitsOnly.substring(0, 3);
    const last2 = digitsOnly.substring(digitsOnly.length - 2);
    const maskedMiddle = '*'.repeat(Math.max(0, digitsOnly.length - 5));
    
    return `${first3}${maskedMiddle}${last2}`;
};

/**
 * Masks email address - shows first 2 chars and domain
 * Example: john.doe@example.com → jo***@example.com
 */
export const maskEmail = (email) => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return email;
    }
    
    const [localPart, domain] = email.split('@');
    
    if (localPart.length <= 2) {
        return `**@${domain}`;
    }
    
    const maskedLocal = localPart.substring(0, 2) + '*'.repeat(Math.max(0, localPart.length - 2));
    return `${maskedLocal}@${domain}`;
};

/**
 * Masks name - shows first name and last initial
 * Example: John Smith → John S.
 */
export const maskName = (name) => {
    if (!name || typeof name !== 'string') {
        return name;
    }
    
    const parts = name.trim().split(' ');
    
    if (parts.length === 1) {
        // Single name - show first 2 chars
        return parts[0].length > 2 ? parts[0].substring(0, 2) + '***' : parts[0];
    }
    
    // Multiple parts - show first name and last initial
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);
    
    return `${firstName} ${lastInitial}.`;
};

/**
 * Masks all sensitive data in a lead object
 */
export const maskLeadData = (lead) => {
    if (!lead) return lead;
    
    return {
        ...lead,
        phone: maskPhoneNumber(lead.phone),
        email: lead.email ? maskEmail(lead.email) : lead.email,
        name: lead.name ? maskName(lead.name) : lead.name
    };
};

/**
 * Masks sensitive data in call log
 */
export const maskCallData = (call) => {
    if (!call) return call;
    
    return {
        ...call,
        callerNumber: maskPhoneNumber(call.callerNumber),
        formattedCallerNumber: maskPhoneNumber(call.formattedCallerNumber)
    };
};

/**
 * Masks sensitive data in SMS conversation
 */
export const maskConversationData = (conversation) => {
    if (!conversation) return conversation;
    
    return {
        ...conversation,
        phoneNumber: maskPhoneNumber(conversation.phoneNumber),
        formattedPhoneNumber: maskPhoneNumber(conversation.formattedPhoneNumber)
    };
};

/**
 * General purpose data masker for API responses
 */
export const maskSensitiveData = (data, type = 'general') => {
    if (!data) return data;
    
    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item, type));
    }
    
    switch (type) {
        case 'lead':
            return maskLeadData(data);
        case 'call':
            return maskCallData(data);
        case 'conversation':
            return maskConversationData(data);
        default:
            return data;
    }
}; 