/**
 * Checks if message contains contact information
 * @param {string} message - User's message
 * @returns {Object|null} Extracted contact info or null
 */
export function extractContactInfo(message) {
    // Handle space-separated format (name phone email)
    const parts = message.split(/[\s,]+/).map(part => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
        // Find email in parts
        const emailIndex = parts.findIndex(part => 
            /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/i.test(part)
        );
        
        if (emailIndex !== -1) {
            // Find phone number (sequence of digits)
            const phoneIndex = parts.findIndex(part => 
                /^\d[\d-]{7,}$/.test(part.replace(/\s+/g, ''))
            );
            
            if (phoneIndex !== -1) {
                // Assume name is everything before phone and email
                const nameEndIndex = Math.min(phoneIndex, emailIndex);
                const name = parts.slice(0, nameEndIndex).join(' ');
                
                if (name) {
                    return {
                        name,
                        phone: parts[phoneIndex].replace(/\s+/g, ''),
                        email: parts[emailIndex]
                    };
                }
            }
        }
    }

    // Handle comma-separated format (name, phone, email)
    const commaParts = message.split(',').map(part => part.trim());
    if (commaParts.length === 3) {
        const [name, phone, email] = commaParts;
        // Validate each part
        if (
            name && // Name exists
            /^\d[\d\s-]{7,}$/.test(phone.replace(/\s+/g, '')) && // Phone number validation
            /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/i.test(email) // Email validation
        ) {
            return {
                name,
                phone: phone.replace(/\s+/g, ''),
                email
            };
        }
    }

    // Handle structured format (name: xxx, phone: xxx, email: xxx)
    const structuredMatch = {
        name: message.match(/name:\s*([^,]+)/i)?.[1]?.trim(),
        phone: message.match(/phone:\s*([^,]+)/i)?.[1]?.trim(),
        email: message.match(/email:\s*([^,]+)/i)?.[1]?.trim()
    };

    if (structuredMatch.name && structuredMatch.phone && structuredMatch.email) {
        return structuredMatch;
    }

    // Handle natural format
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9._-]+/i;
    const phoneRegex = /(\+?1(?:[\s.-]?))?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/g;
    const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;

    // --- Reworked Natural Extraction (v5) ---
    let extractedEmail = null;
    let extractedPhone = null;
    let extractedName = null;

    // 1. Try Email
    const localEmailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/i;
    const emailTestResult = localEmailRegex.test(message);
    const emailMatchResult = message.match(localEmailRegex);
    if (emailMatchResult && emailMatchResult[0]) {
        extractedEmail = emailMatchResult[0];
    }

    // 2. Try Phone
    phoneRegex.lastIndex = 0; 
    const phoneMatchResult = phoneRegex.exec(message);
    if (phoneMatchResult) {
        const potentialPrefix = phoneMatchResult[1] || '';
        const areaCode = phoneMatchResult[2];
        const middlePart = phoneMatchResult[3];
        const lastPart = phoneMatchResult[4];
        const prefix = potentialPrefix.includes('1') ? '+1' : ''; 
        extractedPhone = prefix + areaCode + middlePart + lastPart;
    }

    // 3. Try Name *ONLY IF* email or phone was also found in this message
    if (extractedEmail || extractedPhone) {
        let potentialNamePortion = message;
        if (extractedEmail) potentialNamePortion = potentialNamePortion.replace(extractedEmail, '');
        if (phoneMatchResult) potentialNamePortion = potentialNamePortion.replace(phoneMatchResult[0], '');
        potentialNamePortion = potentialNamePortion.replace(/[,.:;!?&]/g, '').trim();

        if (potentialNamePortion.length > 0) {
            const nameMatch = potentialNamePortion.match(nameRegex);
            if (nameMatch && nameMatch[1].trim().length > 1) { 
                extractedName = nameMatch[1].trim();
            }
        }
    }
    // --- End Reworked Natural Extraction (v5) ---

    // Return if *any* piece was extracted
    if (extractedEmail || extractedPhone || extractedName) {
        return {
            email: extractedEmail,
            phone: extractedPhone,
            name: extractedName
        };
    }
    
    return null;
}




