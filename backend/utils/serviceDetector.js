import stringSimilarity from "string-similarity";

// Service detection thresholds
const SIMILARITY_THRESHOLD = 0.6;
const EXACT_MATCH_THRESHOLD = 0.8;

/**
 * Detects mentioned services in a message using string similarity
 * @param {string} message - User's message
 * @param {Array} availableServices - List of available services from business data
 * @returns {string|null} Detected service name or null if none found
 */
export function detectService(message, availableServices) {
    const lowercaseMsg = message.toLowerCase();
    const serviceNames = availableServices.map(service => service.name.toLowerCase());
    
    // First check for exact matches
    for (const serviceName of serviceNames) {
        if (lowercaseMsg.includes(serviceName)) {
            return availableServices.find(s => 
                s.name.toLowerCase() === serviceName
            ).name;
        }
    }

    // Check service variations and similar matches
    const words = lowercaseMsg.split(/\s+/);
    for (const word of words) {
        // Skip common words
        if (word.length < 3) continue;

        const matches = stringSimilarity.findBestMatch(word, serviceNames);
        if (matches.bestMatch.rating >= EXACT_MATCH_THRESHOLD) {
            return availableServices.find(s => 
                s.name.toLowerCase() === matches.bestMatch.target
            ).name;
        }
    }

    // Check for partial matches in the full message
    const fullMessageMatches = serviceNames.map(service => ({
        service,
        rating: stringSimilarity.compareTwoStrings(lowercaseMsg, service)
    }));

    const bestMatch = fullMessageMatches.reduce((best, current) => 
        current.rating > best.rating ? current : best
    );

    if (bestMatch.rating >= SIMILARITY_THRESHOLD) {
        return availableServices.find(s => 
            s.name.toLowerCase() === bestMatch.service
        ).name;
    }

    return null;
}

/**
 * Validates if a service exists in available services
 * @param {string} serviceName - Service to validate
 * @param {Array} availableServices - List of available services
 * @returns {boolean} Whether service exists
 */
export function isValidService(serviceName, availableServices) {
    return availableServices.some(service => 
        service.name.toLowerCase() === serviceName.toLowerCase()
    );
}

/**
 * Gets service details from available services
 * @param {string} serviceName - Service to get details for
 * @param {Array} availableServices - List of available services
 * @returns {Object|null} Service details or null if not found
 */
export function getServiceDetails(serviceName, availableServices) {
    return availableServices.find(service => 
        service.name.toLowerCase() === serviceName.toLowerCase()
    ) || null;
}

/**
 * Checks if message contains service-related keywords
 * @param {string} message - User's message
 * @returns {boolean} Whether message is service-related
 */
export function isServiceRelatedQuery(message) {
    const serviceKeywords = [
        'service', 'treatment', 'procedure', 'option',
        'offer', 'provide', 'available', 'do you have',
        'how much', 'price', 'cost', 'about'
    ];

    const lowercaseMsg = message.toLowerCase();
    return serviceKeywords.some(keyword => lowercaseMsg.includes(keyword));
}