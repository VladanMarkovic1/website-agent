import stringSimilarity from "string-similarity";

// Adjusted thresholds for better matching
const SIMILARITY_THRESHOLD = 0.65;  // Lowered for better matching
const EXACT_MATCH_THRESHOLD = 0.80; // Lowered slightly

// Expanded stopwords list
const STOPWORDS = [
  "is", "the", "a", "an", "in", "on", "of", "for", 
  "and", "or", "ii", "to", "when", "i", "have",
  "my", "me", "it", "this", "that", "was", "what",
  "how", "why", "where", "who", "which", "ma", "kid",
  "need", "want", "looking", "about", "get", "can"
];

// Enhanced service-specific keywords mapping
const SERVICE_KEYWORDS = {
  "emergency": [
    "emergency", "urgent", "broke", "broken", "accident", "pain", "hurt",
    "swollen", "swelling", "bleeding", "severe", "immediate", "asap",
    "toothache", "ache", "infected", "infection", "unbearable"
  ],
  "pediatric": [
    "kid", "child", "children", "baby", "toddler", "young",
    "pediatric", "paediatric", "infant", "teen", "teenage",
    "youth", "junior", "minor", "school"
  ],
  "cosmetic": [
    "cosmetic", "appearance", "aesthetic", "veneer", "veneers",
    "smile makeover", "teeth whitening", "dental makeover",
    "cosmetic dentistry", "dental aesthetics"
  ],
  "preventive": [
    "prevent", "check", "cleaning", "routine", "regular",
    "checkup", "check-up", "exam", "examination", "hygiene",
    "clean", "polish", "scaling", "maintenance", "preventative"
  ],
  "restorative": [
    "repair", "fix", "restore", "filling", "crown", "bridge",
    "cavity", "cavities", "hole", "crack", "cracked", "chip",
    "chipped", "implant", "denture", "partial", "root canal"
  ],
  "orthodontic": [
    "brace", "braces", "orthodontic", "orthodontics", "aligner",
    "aligners", "invisalign", "straight", "straighten", "crooked",
    "bite", "overbite", "underbite", "crossbite"
  ],
  "surgical": [
    "surgery", "surgical", "extract", "extraction", "remove",
    "wisdom", "implant", "implants", "graft", "grafting"
  ],
  "periodontal": [
    "gum", "gums", "periodontal", "periodontist", "deep cleaning",
    "gingivitis", "recession", "bleeding gums", "sensitive"
  ],
  'Emergency Dental Care': ['emergency', 'urgent', 'severe pain', 'swelling'],
  'Restorative Dentistry': ['restoration', 'restorative', 'restore'],
  'Dental Implants': ['implant', 'implants'],
  'Teeth Whitening': ['whitening', 'whiten', 'bleaching'],
  'Dental Crowns': ['crown', 'crowns'],
  'Root Canal': ['root canal', 'root'],
  'Dental Bridges': ['bridge', 'bridges'],
  'Dentures': ['denture', 'dentures'],
  'General Dentistry': ['checkup', 'cleaning', 'general', 'routine']
};

// Don't automatically map these to services
const PROBLEM_KEYWORDS = [
    'broken', 'broke', 'fix', 'repair', 'fixed', 'problem', 
    'issue', 'hurt', 'hurts', 'pain', 'ache', 'sore'
];

// Common dental symptoms mapping to services with context
const SYMPTOM_SERVICE_MAP = {
  // Emergency situations
  "pain": { service: "emergency", context: ["tooth", "teeth", "mouth", "jaw", "gum"] },
  "ache": { service: "emergency", context: ["tooth", "teeth", "mouth", "jaw"] },
  "swelling": { service: "emergency", context: ["face", "mouth", "gum", "jaw"] },
  "bleeding": { service: "emergency", context: ["gum", "tooth", "mouth"] },
  "broke": { service: "emergency", context: ["tooth", "teeth", "crown", "filling"] },
  "broken": { service: "emergency", context: ["tooth", "teeth", "crown", "filling"] },
  "accident": { service: "emergency", context: ["tooth", "teeth", "mouth", "dental"] },
  "knocked": { service: "emergency", context: ["tooth", "teeth", "out"] },
  
  // Specific concerns that don't automatically map to services
  "spots": { service: null, context: ["tooth", "teeth"] },
  "white": { service: null, context: ["spot", "spots", "mark", "marks"] },
  "stain": { service: null, context: ["tooth", "teeth"] },
  "yellow": { service: null, context: ["tooth", "teeth"] },
  "dark": { service: null, context: ["spot", "spots", "tooth", "teeth"] }
};

/**
 * Detects mentioned services in a message using string similarity and context,
 * ignoring common stopwords and very short words.
 * @param {string} message - User's message
 * @param {Array} availableServices - List of available services from business data
 * @returns {string|null} Detected service name or null if none found
 */
export const detectService = (message, availableServices = []) => {
    if (!message) return null;
    
    const messageLower = message.toLowerCase();

    // Don't map to a service if it's just a problem description
    // unless they specifically mention a service name
    const isOnlyProblem = PROBLEM_KEYWORDS.some(keyword => messageLower.includes(keyword)) &&
        !Object.values(SERVICE_KEYWORDS).flat().some(keyword => messageLower.includes(keyword));

    if (isOnlyProblem) {
        return null;
    }

    // 1. First check for emergency situations with context
    for (const [symptom, { service, context }] of Object.entries(SYMPTOM_SERVICE_MAP)) {
      if (messageLower.includes(symptom)) {
        // Check if any context word is present
        const hasContext = context.some(ctx => messageLower.includes(ctx));
        if (hasContext && service) { // Only if service is not null
          const emergencyService = availableServices.find(s => 
            s.name.toLowerCase().includes(service) || 
            (s.description && s.description.toLowerCase().includes(service))
          );
          if (emergencyService) return emergencyService.name;
        }
      }
    }

    // 2. Check for emergency keywords with high priority
    const isEmergency = SERVICE_KEYWORDS.emergency.some(keyword => {
      if (messageLower.includes(keyword)) {
        return messageLower.includes('tooth') || 
               messageLower.includes('teeth') || 
               messageLower.includes('dental') ||
               messageLower.includes('mouth') ||
               messageLower.includes('pain');
      }
      return false;
    });

    if (isEmergency) {
      const emergencyService = availableServices.find(s => 
        s.name.toLowerCase().includes('emergency') || 
        s.name.toLowerCase().includes('urgent')
      );
      if (emergencyService) return emergencyService.name;
    }

    // 3. Check for specific service mentions with explicit intent
    for (const [category, keywords] of Object.entries(SERVICE_KEYWORDS)) {
      // Only match if user explicitly mentions the service
      const hasExactKeyword = keywords.some(keyword => 
        messageLower.includes(keyword) && 
        // For compound keywords (e.g., "smile makeover"), ensure both words are present
        (keyword.includes(' ') ? keyword.split(' ').every(k => messageLower.includes(k)) : true)
      );

      if (hasExactKeyword) {
        const matchedService = availableServices.find(s => 
          s.name.toLowerCase().includes(category) ||
          (s.description && s.description.toLowerCase().includes(category))
        );
        if (matchedService) return matchedService.name;
      }
    }

    // 4. If no service detected but emergency context exists, default to emergency
    if (messageLower.includes('tooth') || messageLower.includes('teeth')) {
      if (messageLower.includes('broke') || 
          messageLower.includes('broken') || 
          messageLower.includes('accident') ||
          messageLower.includes('hurt') ||
          messageLower.includes('injured')) {
        const emergencyService = availableServices.find(s => 
          s.name.toLowerCase().includes('emergency') || 
          s.name.toLowerCase().includes('urgent')
        );
        if (emergencyService) return emergencyService.name;
      }
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
