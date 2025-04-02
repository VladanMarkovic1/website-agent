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
    'issue', 'hurt', 'hurts', 'pain', 'ache', 'sore',
    'black', 'dark', 'hole', 'spot', 'cavity', 'decay'
];

// Specific symptoms that need attention but don't map to services
const SYMPTOMS = {
    cavity: ['cavity', 'hole', 'black spot', 'dark spot', 'decay'],
    pain: ['pain', 'hurt', 'ache', 'sore', 'sensitive'],
    emergency: ['broken', 'chipped', 'knocked out', 'bleeding'],
    cosmetic: ['stain', 'yellow', 'discolored', 'crooked']
};

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
 * @param {Array} services - List of available services from business data
 * @returns {string|null} Detected service name or null if none found
 */
export const detectService = (message, services) => {
    if (!message || !services) return null;

    const messageLower = message.toLowerCase().trim();

    // Normalize service names for better matching
    const normalizedServices = services.map(service => ({
        ...service,
        normalizedName: service.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    }));

    // Check for various ways of asking about services
    const inquiryPhrases = [
        'interested in',
        'want to know about',
        'tell me about',
        'explain me more about',
        'explain more about',
        'can you explain',
        'what about',
        'how about',
        'more about',
        'learn about',
        'know about'
    ];
    
    // First try to match after inquiry phrases
    for (const phrase of inquiryPhrases) {
        if (messageLower.includes(phrase)) {
            const afterPhrase = messageLower.split(phrase)[1]?.trim();
            if (afterPhrase) {
                // Normalize the phrase for comparison
                const normalizedPhrase = afterPhrase.replace(/[^a-z0-9\s]/g, '');
                
                // Try exact match first
                const exactMatch = normalizedServices.find(service => 
                    normalizedPhrase === service.normalizedName);
                if (exactMatch) return exactMatch.name;

                // Try partial match if no exact match found
                const partialMatch = normalizedServices.find(service => 
                    normalizedPhrase.includes(service.normalizedName) ||
                    service.normalizedName.includes(normalizedPhrase));
                if (partialMatch) return partialMatch.name;
            }
        }
    }

    // If no match found with phrases, try direct service name matching
    const normalizedMessage = messageLower.replace(/[^a-z0-9\s]/g, '');
    const directMatch = normalizedServices.find(service => 
        normalizedMessage.includes(service.normalizedName));
    
    return directMatch ? directMatch.name : null;
};

/**
 * Validates if a service exists in available services
 * @param {string} serviceName - Service to validate
 * @param {Array} services - List of available services
 * @returns {boolean} Whether service exists
 */
export function isValidService(serviceName, services) {
  return services.some(service => 
    service.name.toLowerCase() === serviceName.toLowerCase()
  );
}

/**
 * Gets service details from available services
 * @param {string} serviceName - Service to get details for
 * @param {Array} services - List of available services
 * @returns {Object|null} Service details or null if not found
 */
export function getServiceDetails(serviceName, services) {
  if (!serviceName || !services) return null;
  return services.find(service => 
    service.name.toLowerCase() === serviceName.toLowerCase()
  );
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
