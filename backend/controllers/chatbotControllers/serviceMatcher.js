/**
 * Tries to match the user message against a list of known business services.
 * Uses a scoring system to determine the best match.
 * 
 * @param {string} message - The user's message, already lowercased.
 * @param {Object} context - Context object containing business data, specifically `context.services` array.
 * @returns {Object|null} The matched service object or null if no strong match found.
 */
export const handleServiceInquiry = async (normalizedMessage, services) => {
    // console.log('[Service Match] Handling service inquiry for message:', normalizedMessage);
    // console.log('[Service Match] Available services:', services.map(s => s.name).join(', '));

    if (!services || services.length === 0) return null;

    let bestMatch = null;
    let highestMatchScore = 0; // Score: 3=Exact Phrase, 2=All Words, 1=Significant Word

    for (const service of services) {
        if (!service || !service.name) continue;

        // console.log(`[Service Match] Checking service: "${service.name}"`);
        const serviceNameLower = service.name.toLowerCase();
        const serviceWords = serviceNameLower.split(' ').filter(w => w.length > 2); // Ignore short words

        // 1. Exact Phrase Match (Highest Priority)
        if (normalizedMessage.includes(serviceNameLower)) {
            // console.log(`[Service Match] Found exact phrase match for "${service.name}"`);
            if (3 > highestMatchScore) {
                 highestMatchScore = 3;
                 bestMatch = service;
            }
            continue; // Found best possible match for this service
        }

        // 2. All Words Match (Medium Priority)
        if (serviceWords.length > 1 && serviceWords.every(word => normalizedMessage.includes(word))) {
            // console.log(`[Service Match] Found all words match for "${service.name}"`);
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
            // console.log(`[Service Match] Found significant word match for "${service.name}"`);
             if (1 > highestMatchScore) {
                 highestMatchScore = 1;
                 bestMatch = service;
             }
        }
        // console.log(`[Service Match] New best match: "${bestMatch?.name}" with score ${highestMatchScore}`); // Check intermediate best

    } // End loop through services

    // console.log(`[Service Match] Final check: Best match "${bestMatch?.name}" with score ${highestMatchScore}`);

    // Return the best match only if the score indicates a reasonable match (e.g., score > 0)
    if (highestMatchScore > 0) {
        // console.log('[Service Match] Final matched service (Score > 0):', bestMatch.name);
        return bestMatch;
    }

    return null;
}; 