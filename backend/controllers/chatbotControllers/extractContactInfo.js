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
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
    const phoneRegex = /(\d[\d\s-]{7,})/;
    const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;

    const email = message.match(emailRegex)?.[1];
    const phone = message.match(phoneRegex)?.[1]?.replace(/\s+/g, '');
    let name = message.match(nameRegex)?.[1];

    // If we found at least ONE piece of information using the individual regex
    if (email || phone || name) { 
        return {
            email: email || null,
            phone: phone || null,
            name: name || null
        };
    }

    return null;
}




