import stringSimilarity from "string-similarity";

// Service detection thresholds
const SIMILARITY_THRESHOLD = 0.6;
const EXACT_MATCH_THRESHOLD = 0.8;

// Common filler words that shouldn't trigger a match
const STOPWORDS = [
  "is", "the", "a", "an", "in", "on", "of", "for", 
  "and", "or", "ii", "to", "when", "i", "have"
];

/**
 * Detects mentioned services in a message using string similarity,
 * ignoring common stopwords and very short words.
 * @param {string} message - User's message
 * @param {Array} availableServices - List of available services from business data
 * @returns {string|null} Detected service name or null if none found
 */
export function detectService(message, availableServices) {
  // 1. Split and filter message words
  let words = message
    .toLowerCase()
    .split(/\s+/)                  // split on whitespace
    .filter(word => {
      // remove stopwords and words shorter than 3 characters
      return !STOPWORDS.includes(word) && word.length >= 3;
    });

  // If no usable words left, return null
  if (words.length === 0) {
    return null;
  }

  // 2. Prepare service names in lowercase
  const serviceNames = availableServices.map(s => s.name.toLowerCase());

  // 3. Exact match check (word-for-word match with a service name)
  for (const word of words) {
    if (serviceNames.includes(word)) {
      // Return the first exact match found
      const matchedService = availableServices.find(
        s => s.name.toLowerCase() === word
      );
      return matchedService?.name || null;
    }
  }

  // 4. Fuzzy match each word against service names
  for (const word of words) {
    const matches = stringSimilarity.findBestMatch(word, serviceNames);
    if (matches.bestMatch.rating >= EXACT_MATCH_THRESHOLD) {
      const matchedService = availableServices.find(
        s => s.name.toLowerCase() === matches.bestMatch.target
      );
      return matchedService?.name || null;
    }
  }

  // 5. As a fallback, compare the *entire processed message* to each service name
  const filteredMessage = words.join(" ");
  const fullMessageMatches = serviceNames.map(serviceName => ({
    serviceName,
    rating: stringSimilarity.compareTwoStrings(filteredMessage, serviceName)
  }));

  // Find the best overall match
  const bestMatch = fullMessageMatches.reduce((best, current) =>
    current.rating > best.rating ? current : best
  );

  if (bestMatch.rating >= SIMILARITY_THRESHOLD) {
    const matchedService = availableServices.find(
      s => s.name.toLowerCase() === bestMatch.serviceName
    );
    return matchedService?.name || null;
  }

  // If no match found
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
