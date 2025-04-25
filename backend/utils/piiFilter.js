// Basic regular expressions for PII detection
// Very basic email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/; 

// Basic North American phone number regex (adapt for other regions if needed)
// Matches formats like (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890 etc.
const phoneRegex = /(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;

// Keywords often associated with contact info requests/provision
const contactKeywords = [
    'email', 'e-mail', 'mail', 
    'phone', 'number', 'call', 'contact',
    'address', 'street', 'city', 'zip', 'postal' 
];

/**
 * Checks if a given text string contains potential PII (email or phone).
 * This is a basic check and may have false positives/negatives.
 * @param {string} text The text to check.
 * @returns {boolean} True if potential PII is detected, false otherwise.
 */
export function containsPotentialPII(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    
    const lowerText = text.toLowerCase();

    // Check for email
    if (emailRegex.test(text)) {
        return true;
    }

    // Check for phone number
    if (phoneRegex.test(text)) {
        // Add a simple check to reduce false positives like "model 345-6789"
        // If it contains a likely keyword nearby, it's more likely PII
        if (contactKeywords.some(keyword => lowerText.includes(keyword))) {
             return true;
        }
        // Also consider it PII if it's a relatively short message consisting mostly of the number
        if (text.replace(/[^0-9]/g, '').length >= 7 && text.length < 30) {
             return true;
        }
    }
    
    return false;
}

/**
 * Replaces detected PII in a string with a placeholder.
 * @param {string} text The text to sanitize.
 * @param {string} [placeholder='[REDACTED]'] The placeholder to use.
 * @returns {string} The sanitized text.
 */
export function redactPII(text, placeholder = '[REDACTED]') {
     if (!text || typeof text !== 'string') {
        return text;
    }
    
    // Basic redaction - replace potential emails and phones
    // Note: This is very simple and might redact non-PII or miss complex cases.
    let redactedText = text.replace(emailRegex, placeholder);
    redactedText = redactedText.replace(phoneRegex, (match) => {
        // Only redact if it looks like a plausible phone number based on our contains check logic
        if (containsPotentialPII(match)) { 
            return placeholder;
        }
        return match; // Don't redact if it doesn't pass the PII check
    });

    return redactedText;
} 