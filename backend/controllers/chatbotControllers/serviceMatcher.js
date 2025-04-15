/**
 * Tries to match the user message against a list of known business services.
 * Uses a scoring system to determine the best match.
 * 
 * @param {string} message - The user's message, already lowercased.
 * @param {Object} context - Context object containing business data, specifically `context.services` array.
 * @returns {Object|null} The matched service object or null if no strong match found.
 */
export const handleServiceInquiry = async (message, context) => {
    const normalizedMessage = message; // Assuming already lowercased by caller
    const services = context.services || [];
    
    console.log('[Service Match] Handling service inquiry for message:', normalizedMessage);
    console.log('[Service Match] Available services:', services.map(s => s.name).join(', '));

    let matchingService = null;
    let highestMatchScore = 0; // Use a score to find the best match

    for (const service of services) {
        if (!service || !service.name) continue;

        const serviceNameLower = service.name.toLowerCase().trim();
        const serviceWords = serviceNameLower.split(/\s+/); // Split by space
        let currentScore = 0;

        console.log(`[Service Match] Checking service: "${service.name}"`);

        // 1. Exact Match (Highest Score)
        if (normalizedMessage.includes(serviceNameLower)) {
            console.log(`[Service Match] Found exact phrase match for "${service.name}"`);
            currentScore = 3;
        }

        // 2. All Words Match (High Score)
        if (currentScore < 3) { 
            const allWordsPresent = serviceWords.every(word => normalizedMessage.includes(word));
            if (allWordsPresent) {
                console.log(`[Service Match] Found all words match for "${service.name}"`);
                currentScore = Math.max(currentScore, 2); // Don't override exact match
            }
        }
        
        // 3. Significant Word Match (Medium Score) - Keep or remove based on strictness?
        if (currentScore < 2) {
            const significantWords = serviceWords.filter(word => word.length > 3); 
            const significantMatch = significantWords.length > 0 && significantWords.some(word => normalizedMessage.includes(word));

            if (significantMatch) {
                 console.log(`[Service Match] Found significant word match for "${service.name}"`);
                 currentScore = Math.max(currentScore, 1);
            }
        }
        
        if (currentScore > highestMatchScore) {
            highestMatchScore = currentScore;
            matchingService = service; // Store the actual service object
            console.log(`[Service Match] New best match: "${service.name}" with score ${highestMatchScore}`);
        }
    }

    console.log(`[Service Match] Final check: Best match "${matchingService?.name}" with score ${highestMatchScore}`);

    // Require score > 1 (All Words or Exact Match)
    if (matchingService && highestMatchScore > 1) { 
        console.log('[Service Match] Final matched service (Score > 1):', matchingService.name);
        
        // Return the matched service object itself, let the caller build the response
        return matchingService; 
    }

    return null; // No sufficiently strong match
}; 