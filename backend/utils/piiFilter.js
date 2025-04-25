// Basic regular expressions for PII detection
// Very basic email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/; 

// Updated phone regex to be more flexible (7-14 digits, optional +, common separators)
// Matches formats like +1 (123) 456-7890, 123-456-7890, 1234567890, +971 4 276 4269 etc.
// It captures sequences containing 7 to 14 digits, allowing optional +, (, ), -, ., and spaces.
const phoneRegex = /(?:\+?\d[\d\s\-().]{5,16}\d)/;

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

    // Check for phone number using the updated regex
    if (phoneRegex.test(text)) {
        // Extract potential number matches
        const potentialNumbers = text.match(new RegExp(phoneRegex, 'g'));
        if (!potentialNumbers) return false;

        for (const match of potentialNumbers) {
            // Count digits in the specific match
            const digitCount = (match.match(/\d/g) || []).length;

            // Check 1: Does it have a reasonable number of digits (e.g., 7 to 14)?
            if (digitCount >= 7 && digitCount <= 14) {
                // Check 2: Does it have contact keywords nearby?
                if (contactKeywords.some(keyword => lowerText.includes(keyword))) {
                    return true;
                }
                // Check 3: Is it a significant part of a short message?
                if (text.length < 35) { // Adjusted length threshold slightly
                    return true;
                }
            }
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
    // Use a global flag with the updated regex for redaction
    redactedText = redactedText.replace(new RegExp(phoneRegex, 'g'), (match) => {
        // Only redact if it looks like a plausible phone number based on our contains check logic
        if (containsPotentialPII(match)) {
            return placeholder;
        }
        return match; // Don't redact if it doesn't pass the PII check
    });

    return redactedText;
} 