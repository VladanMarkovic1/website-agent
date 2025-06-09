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

    if (structuredMatch.name && structuredMatch.phone && structuredMatch.email) {
        return {
            name: structuredMatch.name,
            phone: structuredMatch.phone.replace(/\D/g, ''), // Extract only digits
            email: structuredMatch.email
        };
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

    // 3. Extract Name - take the first word(s) that look like a name
    if (extractedEmail || extractedPhone) {
        let nameCandidate = message;
        
        // Remove email and phone from the message
        if (extractedEmail) nameCandidate = nameCandidate.replace(extractedEmail, '');
        if (phoneMatch) nameCandidate = nameCandidate.replace(phoneMatch[0], '');
        
        // Clean up the remaining text
        nameCandidate = nameCandidate.replace(/[,.:;!?&]/g, ' ').trim();
        
        // Extract the first meaningful word(s)
        const nameMatch = nameCandidate.match(/([A-Za-z]+(?:\s+[A-Za-z]+)*)/);
        if (nameMatch && nameMatch[1].trim().length > 1) {
            extractedName = nameMatch[1].trim();
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




