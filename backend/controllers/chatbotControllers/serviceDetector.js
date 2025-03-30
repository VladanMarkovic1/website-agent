import stringSimilarity from "string-similarity";

// Increased thresholds for more strict matching
const SIMILARITY_THRESHOLD = 0.75;  // Increased from 0.6
const EXACT_MATCH_THRESHOLD = 0.85; // Increased from 0.8

// Expanded stopwords list
const STOPWORDS = [
  "is", "the", "a", "an", "in", "on", "of", "for", 
  "and", "or", "ii", "to", "when", "i", "have",
  "my", "me", "it", "this", "that", "was", "what",
  "how", "why", "where", "who", "which", "ma", "kid"
];

// Service-specific keywords mapping
const SERVICE_KEYWORDS = {
  "emergency": ["emergency", "urgent", "broke", "broken", "accident", "pain", "hurt"],
  "pediatric": ["kid", "child", "children", "baby", "toddler", "young"],
  "cosmetic": ["cosmetic", "appearance", "look", "aesthetic", "white", "whiten"],
  "preventive": ["prevent", "check", "cleaning", "routine", "regular"],
  "restorative": ["repair", "fix", "restore", "filling", "crown", "bridge"]
};

/**
 * Detects mentioned services in a message using string similarity and context,
 * ignoring common stopwords and very short words.
 * @param {string} message - User's message
 * @param {Array} availableServices - List of available services from business data
 * @returns {string|null} Detected service name or null if none found
 */
export function detectService(message, availableServices) {
  if (!Array.isArray(availableServices) || availableServices.length === 0) {
    return null;
  }

  const lowercaseMessage = message.toLowerCase();
  
  // 1. First check for emergency keywords
  const emergencyKeywords = ["emergency", "urgent", "broke", "broken", "accident", "severe pain"];
  const isEmergency = emergencyKeywords.some(keyword => lowercaseMessage.includes(keyword));
  if (isEmergency) {
    const emergencyService = availableServices.find(s => 
      s.name.toLowerCase().includes("emergency") || 
      s.name.toLowerCase().includes("urgent")
    );
    if (emergencyService) return emergencyService.name;
  }

  // 2. Check for age-specific context (pediatric/children)
  const childKeywords = ["kid", "child", "baby", "son", "daughter"];
  const isChildRelated = childKeywords.some(keyword => lowercaseMessage.includes(keyword));
  if (isChildRelated) {
    const pediatricService = availableServices.find(s => 
      s.name.toLowerCase().includes("pediatric") || 
      s.name.toLowerCase().includes("child")
    );
    if (pediatricService) return pediatricService.name;
  }

  // 3. Split and filter message words
  let words = lowercaseMessage
    .split(/\s+/)
    .filter(word => !STOPWORDS.includes(word) && word.length >= 3);

  if (words.length === 0) return null;

  // 4. Prepare service names in lowercase
  const serviceNames = availableServices.map(s => s.name.toLowerCase());

  // 5. Exact match check
  for (const word of words) {
    if (serviceNames.includes(word)) {
      const matchedService = availableServices.find(
        s => s.name.toLowerCase() === word
      );
      return matchedService?.name || null;
    }
  }

  // 6. Check for service category matches
  for (const [category, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
      const matchedService = availableServices.find(s => 
        s.name.toLowerCase().includes(category) ||
        (s.description && s.description.toLowerCase().includes(category))
      );
      if (matchedService) return matchedService.name;
    }
  }

  // 7. As a last resort, try fuzzy matching with higher threshold
  const filteredMessage = words.join(" ");
  const fullMessageMatches = serviceNames.map(serviceName => ({
    serviceName,
    rating: stringSimilarity.compareTwoStrings(filteredMessage, serviceName)
  }));

  const bestMatch = fullMessageMatches.reduce((best, current) =>
    current.rating > best.rating ? current : best
  );

  if (bestMatch.rating >= SIMILARITY_THRESHOLD) {
    const matchedService = availableServices.find(
      s => s.name.toLowerCase() === bestMatch.serviceName
    );
    return matchedService?.name || null;
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
