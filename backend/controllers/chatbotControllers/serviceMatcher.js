/**
 * Tries to match the user message against a list of known business services.
 * Uses a scoring system to determine the best match.
 * 
 * @param {string} message - The user's message, already lowercased.
 * @param {Object} context - Context object containing business data, specifically `context.services` array.
 * @returns {Object|null} The matched service object or null if no strong match found.
 */
export const handleServiceInquiry = async (normalizedMessage, services) => {
    if (!services || services.length === 0) return null;

    let bestMatch = null;
    let highestMatchScore = 0; // Score: 3=Exact Phrase, 2=All Words, 1=Significant Word

    for (const service of services) {
        if (!service || !service.name) continue;

        const serviceNameLower = service.name.toLowerCase();
        const serviceWords = serviceNameLower.split(' ').filter(w => w.length > 2); // Ignore short words

        // 1. Exact Phrase Match (Highest Priority)
        if (normalizedMessage.includes(serviceNameLower)) {
            if (3 > highestMatchScore) {
                 highestMatchScore = 3;
                 bestMatch = service;
            }
            continue; // Found best possible match for this service
        }

        // 2. All Words Match (Medium Priority)
        if (serviceWords.length > 1 && serviceWords.every(word => normalizedMessage.includes(word))) {
             if (2 > highestMatchScore) {
                 highestMatchScore = 2;
                 bestMatch = service;
             }
             continue;
        }

        // 3. Significant Word Match (Lowest Priority)
        const messageWords = new Set(normalizedMessage.split(' '));
        const matchedWords = serviceWords.filter(word => messageWords.has(word));
        if (matchedWords.length > 0 && matchedWords.length >= Math.ceil(serviceWords.length / 2)) { // Match at least half the significant words
             if (1 > highestMatchScore) {
                 highestMatchScore = 1;
                 bestMatch = service;
             }
        }

    } // End loop through services

    // Return the best match only if the score indicates a reasonable match (e.g., score > 0)
    if (highestMatchScore > 0) {
        return bestMatch;
    }

    return null;
}; 