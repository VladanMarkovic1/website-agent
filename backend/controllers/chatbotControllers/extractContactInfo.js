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
            const result = {
                name: rawName.trim(),
                phone: phoneDigits,
                email: rawEmail.trim()
            };
            return result;
        }
    }

    // Handle structured format (name: xxx, phone: xxx, email: xxx)
    const structuredMatch = {
        name: message.match(/name:\s*([^,]+?)(?=\s*,|\s*phone|\s*email|\s*concern|\s*timing|$)/i)?.[1]?.trim(),
        phone: message.match(/phone:\s*([^,]+?)(?=\s*,|\s*email|\s*name|\s*concern|\s*timing|$)/i)?.[1]?.trim(),
        email: message.match(/(?:email|mail):\s*([^,]+?)(?=\s*,|\s*phone|\s*name|\s*concern|\s*timing|$)/i)?.[1]?.trim()
    };

    if (structuredMatch.name && structuredMatch.phone) {
        const cleanedPhone = structuredMatch.phone.replace(/\D/g, '');
        // Ensure name doesn't contain concern or timing info
        const cleanedName = structuredMatch.name.split(/concern:|timing:/i)[0].trim();
        const result = {
            name: cleanedName,
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

    // 3. Extract Name - improved logic to handle both cases: with contact info and standalone names
    let nameCandidate = message;
    
    // Remove email and phone from the message if they exist
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
        // Additional validation: make sure it's not just common words or phrases
        const commonWords = ['the', 'is', 'are', 'and', 'or', 'but', 'my', 'me', 'i', 'you', 'your', 'hi', 'hello', 'hey', 'quiero', 'agendar', 'una', 'cita', 'para', 'carillas', 'dentales', 'necesito', 'busco', 'me', 'gustaria', 'puedo', 'tener', 'hacer', 'ver', 'consultar', 'informacion', 'sobre'];
        const nameWords = potentialName.toLowerCase().split(' ');
        const isValidName = !nameWords.every(word => commonWords.includes(word));
        
        // Additional check: make sure it looks like a real name (not a sentence)
        const isRealName = potentialName.length <= 30 && (potentialName.split(' ').length <= 3);
        
        // Expanded blacklist of common intent phrases (English, Spanish, Italian)
        const commonPhrases = [
          // English
          "i am interested", "i'm interested", "i want to book", "i want an appointment", "i want to schedule", "i would like to book", "i would like an appointment", "i would like to schedule", "i need an appointment", "i need to book", "i need to schedule", "i want information", "i want to know", "i want to consult", "i want consultation", "i want to ask", "i want help", "i need help", "i need information", "i need to ask", "i need consultation", "i need consult", "i want to see", "i want to visit", "i want to talk", "i want to speak", "i want to contact", "i want to reach", "i want to get", "i want to receive", "i want to learn", "i want to try", "i want to start", "i want to begin", "i want to join", "i want to participate", "i want to apply", "i want to register", "i want to sign up", "i want to enroll", "i want to subscribe", "i want to order", "i want to buy", "i want to purchase", "i want to pay", "i want to reserve", "i want to make", "i want to create", "i want to open", "i want to close", "i want to finish", "i want to complete", "i want to end", "i want to stop", "i want to cancel", "i want to change", "i want to update", "i want to edit", "i want to modify", "i want to delete", "i want to remove", "i want to add", "i want to include", "i want to exclude", "i want to continue", "i want to proceed", "i want to confirm", "i want to accept", "i want to decline", "i want to reject", "i want to refuse", "i want to agree", "i want to disagree", "i want to approve", "i want to disapprove", "i want to support", "i want to oppose", "i want to recommend", "i want to suggest", "i want to advise", "i want to warn", "i want to inform", "i want to notify", "i want to announce", "i want to declare", "i want to state", "i want to explain", "i want to describe", "i want to report", "i want to complain", "i want to praise", "i want to thank", "i want to apologize", "i want to excuse", "i want to forgive", "i want to ask for", "i want to request", "i want to demand", "i want to require", "i want to need", "i want to wish", "i want to hope", "i want to expect", "i want to plan", "i want to intend", "i want to mean", "i want to imply", "i want to propose", "i want to offer", "i want to give", "i want to send", "i want to show", "i want to display", "i want to present", "i want to introduce", "i want to mention", "i want to refer", "i want to relate", "i want to connect", "i want to link", "i want to associate", "i want to combine", "i want to mix", "i want to blend", "i want to merge", "i want to join", "i want to unite", "i want to separate", "i want to divide", "i want to split", "i want to break", "i want to cut", "i want to slice", "i want to chop", "i want to dice", "i want to mince", "i want to grind", "i want to crush", "i want to press", "i want to squeeze", "i want to extract", "i want to remove", "i want to eliminate", "i want to get rid of", "i want to throw away", "i want to discard", "i want to dispose", "i want to destroy", "i want to ruin", "i want to damage", "i want to harm", "i want to hurt",
          // Spanish/Italian (already present)
          "quiero agendar", "necesito una", "me gustaria", "puedo tener", "busco informacion", "quiero consultar"
        ];
        const isNotCommonPhrase = !commonPhrases.some(phrase => potentialName.toLowerCase().includes(phrase));
        
        if (isValidName && isRealName && isNotCommonPhrase) {
            extractedName = potentialName;
        }
    }

    // Return if we found something
    if (extractedEmail || extractedPhone || extractedName) {
        const result = {
            email: extractedEmail,
            phone: extractedPhone,
            name: extractedName
        };
        return result;
    }
    
    return null;
}

export function extractExtraDetails(message) {
    const details = {};
    
    // Extract days - enhanced to handle natural language
    const daysMatch = message.match(/Days:\s*([A-Za-z,\s]+)/i);
    if (daysMatch) {
        details.days = daysMatch[1].split(',').map(d => d.trim()).filter(Boolean);
    } else {
        // Handle natural language like "I prefer Monday for my appointment"
        const naturalDaysMatch = message.match(/(?:prefer|like|want|choose)\s+([A-Za-z]+)\s+(?:for|on|my)/i);
        if (naturalDaysMatch) {
            const day = naturalDaysMatch[1];
            if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day.toLowerCase())) {
                details.days = [day];
            }
        }
    }

    // Extract time - enhanced to handle natural language
    const timeMatch = message.match(/Time:\s*([A-Za-z0-9\-: ]+)/i);
    if (timeMatch) {
        details.time = timeMatch[1].trim();
    } else {
        // Handle natural language like "I prefer morning appointments"
        const naturalTimeMatch = message.match(/(?:prefer|like|want)\s+(morning|afternoon|evening)/i);
        if (naturalTimeMatch) {
            details.time = naturalTimeMatch[1];
        }
    }

    // Extract insurance - enhanced to handle natural language
    const insuranceMatch = message.match(/Insurance:\s*(Yes|No)/i);
    if (insuranceMatch) {
        details.insurance = insuranceMatch[1];
    } else {
        // Handle natural language like "I have dental insurance" or "I do not have dental insurance"
        const naturalInsuranceMatch = message.match(/(?:have|do not have|don't have)\s+(?:dental\s+)?insurance/i);
        if (naturalInsuranceMatch) {
            const hasInsurance = message.toLowerCase().includes('have') && !message.toLowerCase().includes('do not have') && !message.toLowerCase().includes("don't have");
            details.insurance = hasInsurance ? 'Yes' : 'No';
        }
    }

    // Extract concern - enhanced to handle natural language
    const concernMatch = message.match(/Concern:\s*([^,\n]+)/i);
    if (concernMatch) {
        const rawConcern = concernMatch[1].trim();
        // Clean up the concern - remove any name or contact info that might have gotten mixed in
        const cleanedConcern = rawConcern
            .replace(/name:\s*[^,]+/i, '')
            .replace(/phone:\s*[^,]+/i, '')
            .replace(/email:\s*[^,]+/i, '')
            .trim();
        details.concern = cleanedConcern;
    } else {
        // Handle natural language like "I'm interested in Pain" or "I want to know about Implants"
        const naturalConcernMatch = message.match(/(?:interested in|want to know about|need help with|looking for)\s+([A-Za-z\s]+)/i);
        if (naturalConcernMatch) {
            const concern = naturalConcernMatch[1].trim();
            // Filter out common words that aren't concerns
            const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
            const concernWords = concern.split(' ').filter(word => !commonWords.includes(word.toLowerCase()));
            if (concernWords.length > 0) {
                details.concern = concernWords.join(' ');
            }
        }
    }

    // Extract timing - enhanced to handle natural language
    const timingMatch = message.match(/Timing:\s*([^,\n]+)/i);
    if (timingMatch) {
        const rawTiming = timingMatch[1].trim();
        // Clean up the timing - remove any name or contact info that might have gotten mixed in
        const cleanedTiming = rawTiming
            .replace(/name:\s*[^,]+/i, '')
            .replace(/phone:\s*[^,]+/i, '')
            .replace(/email:\s*[^,]+/i, '')
            .trim();
        details.timing = cleanedTiming;
    } else {
        // Handle natural language like "I would like an appointment now" or "I would like an appointment this week"
        const naturalTimingMatch = message.match(/(?:appointment|visit)\s+(now|this week|next week|1-3 weeks|1-3 months|soon|asap)/i);
        if (naturalTimingMatch) {
            details.timing = naturalTimingMatch[1];
        }
    }

    return details;
}




