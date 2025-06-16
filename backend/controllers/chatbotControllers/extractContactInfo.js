/**
 * Checks if message contains contact information
 * @param {string} message - User's message
 * @returns {Object|null} Extracted contact info or null
 */
export function extractContactInfo(message) {
    // First, try the comma-separated format (most reliable)
    const commaParts = message.split(',').map(part => part.trim());
    if (commaParts.length === 3) {
        const [rawName, rawPhone, rawEmail] = commaParts;
        
        // Extract just the numbers from phone (handles all formats)
        const phoneDigits = rawPhone.replace(/\D/g, '');
        
        // Validate email
        const emailValid = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/i.test(rawEmail);
        
        // Validate phone (should be 10 digits for US numbers, or 7+ for others)
        const phoneValid = phoneDigits.length >= 7;
        
        // Validate name (should not be empty and not just numbers)
        const nameValid = rawName && rawName.trim().length > 0 && !/^\d+$/.test(rawName.trim());
        
        if (nameValid && phoneValid && emailValid) {
            return {
                name: rawName.trim(),
                phone: phoneDigits,
                email: rawEmail.trim()
            };
        }
    }

    // Handle structured format (name: xxx, phone: xxx, email: xxx)
    const structuredMatch = {
        name: message.match(/name:\s*([^,]+?)(?=\s*,|\s*phone|\s*email|$)/i)?.[1]?.trim(),
        phone: message.match(/phone:\s*([^,]+?)(?=\s*,|\s*email|\s*name|$)/i)?.[1]?.trim(),
        email: message.match(/(?:email|mail):\s*([^,]+?)(?=\s*,|\s*phone|\s*name|$)/i)?.[1]?.trim()
    };

    if (structuredMatch.name && structuredMatch.phone) {
        const cleanedPhone = structuredMatch.phone.replace(/\D/g, '');
        const result = {
            name: structuredMatch.name,
            phone: cleanedPhone
        };
        
        if (structuredMatch.email) {
            result.email = structuredMatch.email;
        }
        
        return result;
    }

    // Handle natural format - extract components separately
    let extractedEmail = null;
    let extractedPhone = null;
    let extractedName = null;

    // 1. Extract Email
    const emailMatch = message.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/i);
    if (emailMatch) {
        extractedEmail = emailMatch[0];
    }

    // 2. Extract Phone - find any sequence that looks like a phone number
    const phoneMatch = message.match(/[\(\d][\d\s\-\(\)\.]{6,}/);
    if (phoneMatch) {
        const phoneDigits = phoneMatch[0].replace(/\D/g, '');
        if (phoneDigits.length >= 7) {
            extractedPhone = phoneDigits;
        }
    }

    // 3. Extract Name - improved logic to avoid including phone/email keywords
    if (extractedEmail || extractedPhone) {
        let nameCandidate = message;
        
        // Remove email and phone from the message
        if (extractedEmail) nameCandidate = nameCandidate.replace(extractedEmail, '');
        if (phoneMatch) nameCandidate = nameCandidate.replace(phoneMatch[0], '');
        
        // Remove common keywords that might be included
        nameCandidate = nameCandidate.replace(/\b(name|phone|email|mail|contact|number|tel|telephone):\s*/gi, '');
        nameCandidate = nameCandidate.replace(/\b(name|phone|email|mail|contact|number|tel|telephone)\b/gi, '');
        
        // Clean up punctuation and extra spaces
        nameCandidate = nameCandidate.replace(/[,.:;!?&\-\(\)]/g, ' ').trim();
        nameCandidate = nameCandidate.replace(/\s+/g, ' ').trim();
        
        // Extract the first meaningful word(s) - limit to 2-3 words max for names
        const nameMatch = nameCandidate.match(/([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/);
        if (nameMatch && nameMatch[1].trim().length > 1) {
            const potentialName = nameMatch[1].trim();
            // Additional validation: make sure it's not just common words
            const commonWords = ['the', 'is', 'are', 'and', 'or', 'but', 'my', 'me', 'i', 'you', 'your', 'hi', 'hello', 'hey'];
            const nameWords = potentialName.toLowerCase().split(' ');
            const isValidName = !nameWords.every(word => commonWords.includes(word));
            
            if (isValidName) {
                extractedName = potentialName;
            }
        }
    }

    // Return if we found something
    if (extractedEmail || extractedPhone || extractedName) {
        return {
            email: extractedEmail,
            phone: extractedPhone,
            name: extractedName
        };
    }
    
    return null;
}

export function extractExtraDetails(message) {
    const details = {};
    const daysMatch = message.match(/Days:\s*([A-Za-z,\s]+)/i);
    if (daysMatch) details.days = daysMatch[1].split(',').map(d => d.trim()).filter(Boolean);

    const timeMatch = message.match(/Time:\s*([A-Za-z0-9\-: ]+)/i);
    if (timeMatch) details.time = timeMatch[1].trim();

    const insuranceMatch = message.match(/Insurance:\s*(Yes|No)/i);
    if (insuranceMatch) details.insurance = insuranceMatch[1];

    const concernMatch = message.match(/Concern:\s*([A-Za-z ]+)/i);
    if (concernMatch) details.concern = concernMatch[1].trim();

    const timingMatch = message.match(/Timing:\s*([A-Za-z0-9\- ]+)/i);
    if (timingMatch) details.timing = timingMatch[1].trim();

    return details;
}




