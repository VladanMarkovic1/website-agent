import { extractContactInfo } from './extractContactInfo.js';

// Simple keyword definitions to replace deleted constants
const GREETINGS = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];

const DENTAL_PROBLEMS = {
    appearance: ['cosmetic', 'appearance', 'look', 'smile', 'teeth', 'whitening', 'straighten'],
    pain: ['pain', 'hurt', 'ache', 'sore', 'discomfort'],
    damage: ['broken', 'cracked', 'chipped', 'damaged', 'fractured'],
    sensitivity: ['sensitive', 'sensitivity', 'cold', 'hot', 'temperature'],
    emergency: ['emergency', 'urgent', 'severe', 'extreme']
};

const URGENT_KEYWORDS = ['emergency', 'urgent', 'severe', 'extreme', 'bad', 'terrible', 'awful', 'unbearable'];

const RESPONSE_TEMPLATES = {
    contact_after_yes: "Great! To help you schedule an appointment, could you please provide your name, phone number, and email address?"
};

const SERVICE_FAQ_KEYWORDS = {
    pain: ['painful', 'hurt', 'ache', 'sore'],
    duration: ['long', 'time', 'duration', 'how long'],
    cost: ['cost', 'price', 'expensive', 'cheap', 'affordable', 'how much']
};

const SPECIFIC_SERVICE_QUESTION_KEYWORDS = ['options', 'best', 'recommend', 'suggest', 'which', 'what type'];

const OPERATING_HOURS_KEYWORDS = ['hours', 'open', 'close', 'available', 'when', 'time', 'schedule'];

const RESCHEDULE_KEYWORDS = ['reschedule', 'change', 'move', 'postpone', 'cancel'];

const CANCEL_KEYWORDS = ['cancel', 'cancellation', 'stop', 'end'];

const CONFIRMATION_KEYWORDS = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'alright', 'absolutely', 'definitely'];

const isGreeting = (normalizedMsg) => {
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && normalizedMsg.length < 20;
};

// Renamed from isDentalProblem to checkDentalProblem for clarity
const checkDentalProblem = (normalizedMsg) => {
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isProblem: true, // Changed from isIssue
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    return { isProblem: false }; // Changed from isIssue
};

// Keywords for Appointment Requests
const appointmentKeywords = [
    'appointment', 'appointments', 'appoinment', 'book', 'schedule', 'check in', 'check availability',
    'see the doctor', 'see dr', 'make an appointment',
    'can i come', 'can i visit', 'can i stop by', 'can i drop in', 'can i come today', 'can i come tomorrow', 'can i visit today', 'can i visit tomorrow', 'can i book for', 'can i get in', 'can i see you', 'can i see the dentist', 'can i see dr', 'can i get an appointment', 'can i get a slot', 'can i get scheduled', 'can i get in today', 'can i get in tomorrow'
];

// Keywords for Availability Inquiries (Higher Priority than List Services)
const availabilityKeywords = [
    'weekend', 'saturday', 'sunday', 
    'noon', 'afternoon', 'evening', 'morning',
    'hours', 'available', 'availability', 'when',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'time',
    'today', 'tomorrow', 'open', 'opening', 'close', 'closing', 'walk in', 'walk-in', 'walkin', 'walk ins', 'walk-ins', 'walkins',
    // Add common misspellings if needed, e.g., 'appoinment', 'appointmet'
];

// Keywords indicating a request to list available services
const listServiceKeywords = [
    'list services', 'what services', 'which services', 'do you offer', 'your services',
    'list service'
];

// Keywords indicating potential service inquiry
const serviceInquiryKeywords = ['interested in', 'about', 'want'];

// Keywords for payment/insurance inquiries
const paymentKeywords = [
    'payment plan', 'payment plans', 'payment options', 'insurance', 'financing', 'do you accept', 'do you offer payment', 'do you take insurance', 'can i pay in installments', 'installment', 'installments', 'credit', 'billing', 'cost', 'price', 'how much', 'is it covered', 'coverage', 'copay', 'co-pay', 'down payment', 'monthly payment', 'pay over time', 'split payment', 'affordable', 'discount', 'do you offer financing', 'do you have financing', 'do you offer credit', 'do you accept credit', 'do you accept insurance', 'do you take my insurance', 'is insurance accepted', 'is insurance available', 'is there a payment plan', 'is there financing', 'is there a discount', 'is there a copay', 'is there a co-pay',
    'offer insurance', 'provide insurance', 'any insurance', 'insurance options', 'accept insurance', 'take insurance', 'do you have insurance', 'do you offer any insurance', 'do you provide insurance', 'insurance plans', 'insurance policy', 'insurance coverage', 'insurance available', 'insurance plan', 'insurance policies', 'insurance accepted', 'insurance provider', 'insurance companies', 'insurance question', 'insurance info', 'insurance information', 'insurance details', 'insurance support', 'insurance help', 'insurance inquiry', 'insurance assistance', 'insurance services', 'insurance support', 'insurance-related', 'insurance-related question', 'insurance-related inquiry'
];

// Helper function to find a matching service name in the message
// (More robust matching might be needed depending on service name complexity)
export const findServiceNameInMessage = (normalizedMsg, services = []) => {
    if (!services || services.length === 0) return null;

    const messageWords = new Set(normalizedMsg.split(/[\s,&]+/));

    const foundService = services.find(service => {
        const serviceName = service?.name;
        if (!serviceName) return false;

        let decodedServiceName = serviceName;
        let loopCount = 0;
        while (decodedServiceName.includes('&amp;') && loopCount < 10) {
             decodedServiceName = decodedServiceName.replace(/&amp;/g, '&');
             loopCount++;
        }
        let serviceNameLower = decodedServiceName.toLowerCase();

        if (normalizedMsg.includes(serviceNameLower)) {
            return true;
        }

        const serviceNameWords = serviceNameLower.split(/[\s,&]+/).filter(Boolean);
        if (serviceNameWords.length > 0 && serviceNameWords.every(word => messageWords.has(word))) {
             return true;
        }

        return false; // No match
    });

    return foundService ? foundService.name : null;
};

// Helper function to determine the type of question asked
const getQuestionType = (normalizedMsg) => {
    if (SERVICE_FAQ_KEYWORDS.pain.some(kw => normalizedMsg.includes(kw))) return 'pain';
    if (SERVICE_FAQ_KEYWORDS.duration.some(kw => normalizedMsg.includes(kw))) return 'duration';
    if (SERVICE_FAQ_KEYWORDS.cost.some(kw => normalizedMsg.includes(kw))) return 'cost';
    return 'details'; // Default if specific keywords not found but pattern matches
};

// Helper function to check if the message is a Service FAQ
const checkServiceFAQ = (normalizedMsg, services) => {
    const mentionedServiceName = findServiceNameInMessage(normalizedMsg, services);
    if (!mentionedServiceName) return null; // No service mentioned

    // Combine all FAQ keywords (including service-question keywords like 'options', 'best')
    const questionKeywords = [
        ...SERVICE_FAQ_KEYWORDS.pain, 
        ...SERVICE_FAQ_KEYWORDS.duration, 
        ...SERVICE_FAQ_KEYWORDS.cost,
        ...SPECIFIC_SERVICE_QUESTION_KEYWORDS
    ];

    // Check if the message contains any of the FAQ keywords
    const isFAQ = questionKeywords.some(kw => normalizedMsg.includes(kw));

    if (isFAQ) {
        const questionType = getQuestionType(normalizedMsg); // Determine specific type
        return { serviceName: mentionedServiceName, questionType: questionType };
    }
    
    return null; // Not an FAQ
};

// Helper to check if a bot message requests contact info
const didBotRequestContactInfo = (botMessageContent) => {
    if (!botMessageContent) return false;
    const lowerContent = botMessageContent.toLowerCase();
    
    // Relaxed check: Does it mention any contact field AND use requesting language?
    const mentionsName = lowerContent.includes('name');
    const mentionsPhone = lowerContent.includes('phone');
    const mentionsEmail = lowerContent.includes('email');
    const asksForInfo = lowerContent.includes('provide') || 
                        lowerContent.includes('share') || 
                        lowerContent.includes('could you') || 
                        lowerContent.includes('what is') || 
                        lowerContent.includes('?'); // Check for question mark

    // Require at least one contact field mention and requesting language
    return (mentionsName || mentionsPhone || mentionsEmail) && asksForInfo;

    // Old stricter check:
    // const requestsName = lowerContent.includes('name');
    // const requestsPhone = lowerContent.includes('phone');
    // const requestsEmail = lowerContent.includes('email');
    // return requestsName && requestsPhone && requestsEmail;
};

/**
 * Classifies the user's message intent based on keywords and context.
 * 
 * @param {string} message - The user's current message.
 * @param {Array} messageHistory - The conversation history.
 * @param {Array} services - List of available business services.
 * @param {boolean} isNewSession - Flag indicating if this is the first message.
 * @param {Object} previousPartialInfo - Optional previously collected partial info { name, phone, email }.
 * @returns {Object} An object with 'type' and optional context (e.g., category, contactInfo, missingFields).
 */
export const classifyUserIntent = (message, messageHistory, services = [], isNewSession = false, previousPartialInfo = null) => {
    const normalizedMessage = message.toLowerCase().trim();
    const lastBotMessage = messageHistory.slice().reverse().find(msg => msg.role === 'assistant');
    const sessionId = messageHistory[0]?.sessionId || 'unknown';

    // Check if the bot just asked for contact info
    const botRequestedContact = lastBotMessage && 
                              (lastBotMessage.type === 'CONTACT_REQUEST' || 
                               lastBotMessage.type === 'PARTIAL_CONTACT_REQUEST' ||
                               lastBotMessage.type === 'PEDIATRIC_ADVICE_REQUEST' || 
                               lastBotMessage.type === 'SPECIFIC_ADVICE_REQUEST' ||
                               lastBotMessage.type === 'SPECIFIC_SERVICE_REQUEST' ||
                               lastBotMessage.type === 'BOOKING_SPECIFIC_SERVICE' || 
                               lastBotMessage.type === 'BOOKING_REQUEST' || // Added BOOKING_REQUEST
                               lastBotMessage.type === 'APPOINTMENT_REQUEST_DETAILED'); // Added APPOINTMENT_REQUEST_DETAILED

    if (botRequestedContact) {
        let finalAccumulatedInfo = { ...(previousPartialInfo || {}) };
        let extractedSomethingThisTurn = false;
        
        // Look back only a few messages or until the bot request
        const historyToCheck = [];
        let foundBotRequestMarker = false; // Flag to ensure we only check messages after the request
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            const msg = messageHistory[i];
            if (msg.role === 'assistant' && 
                (msg.type === 'CONTACT_REQUEST' || msg.type === 'PARTIAL_CONTACT_REQUEST' || msg.type === 'PEDIATRIC_ADVICE_REQUEST' || msg.type === 'SPECIFIC_ADVICE_REQUEST' || msg.type === 'SPECIFIC_SERVICE_REQUEST' || msg.type === 'BOOKING_SPECIFIC_SERVICE' || msg.type === 'BOOKING_REQUEST' || msg.type === 'APPOINTMENT_REQUEST_DETAILED')) {
                foundBotRequestMarker = true; 
                break; // Stop when we hit the relevant bot request
            }
            // Only add user messages encountered *before* finding the bot request marker when searching backwards
            // This seems counter-intuitive, let's rebuild historyToCheck going forward *after* the request
        }

        // --- Revised historyToCheck logic ---
        historyToCheck.length = 0; // Clear the array
        let startAddingIndex = -1;
         for (let i = 0; i < messageHistory.length; i++) {
             const msg = messageHistory[i];
             if (msg.role === 'assistant' && 
                 (msg.type === 'CONTACT_REQUEST' || msg.type === 'PARTIAL_CONTACT_REQUEST' || msg.type === 'PEDIATRIC_ADVICE_REQUEST' || msg.type === 'SPECIFIC_ADVICE_REQUEST' || msg.type === 'SPECIFIC_SERVICE_REQUEST' || msg.type === 'BOOKING_SPECIFIC_SERVICE' || msg.type === 'BOOKING_REQUEST' || msg.type === 'APPOINTMENT_REQUEST_DETAILED')) {
                 startAddingIndex = i + 1; // Start adding user messages *after* this bot request
             }
         }
         if (startAddingIndex !== -1) {
             for (let i = startAddingIndex; i < messageHistory.length; i++) {
                 if (messageHistory[i].role === 'user') {
                     historyToCheck.push(messageHistory[i]);
                 }
             }
         }
        // --- End Revised historyToCheck logic ---

        // Add the current message to check as well
        historyToCheck.push({ role: 'user', content: message }); 

        historyToCheck.forEach(userMsg => {
            const extractedFromMsg = extractContactInfo(userMsg.content);
            if (extractedFromMsg) {
                // Merge ONLY IF new info is found in this message
                let merged = false;
                if (extractedFromMsg.name && !finalAccumulatedInfo.name) { finalAccumulatedInfo.name = extractedFromMsg.name; merged = true; }
                if (extractedFromMsg.phone && !finalAccumulatedInfo.phone) { finalAccumulatedInfo.phone = extractedFromMsg.phone; merged = true; }
                if (extractedFromMsg.email && !finalAccumulatedInfo.email) { finalAccumulatedInfo.email = extractedFromMsg.email; merged = true; }
                
                if(merged && userMsg.content === message) { // Check if merge happened for the *current* user message
                     extractedSomethingThisTurn = true; // Mark that we found something new *this turn*
                }
            }
        });

        // Check if accumulated info is now complete (name + phone are required, email is optional)
        const isComplete = finalAccumulatedInfo.name && finalAccumulatedInfo.phone;

        if (isComplete) {
            return {
                type: 'CONTACT_INFO_PROVIDED',
                contactInfo: finalAccumulatedInfo,
                service: findServiceNameInMessage(message, services) // Check current message for service
            };
        } 
        // If we extracted *something* relevant in this turn (or had previous partial), and it's still not complete
        else if (extractedSomethingThisTurn || (previousPartialInfo && (previousPartialInfo.name || previousPartialInfo.phone || previousPartialInfo.email))) { 
             const missingFields = [];
             if (!finalAccumulatedInfo.name) missingFields.push('name');
             if (!finalAccumulatedInfo.phone) missingFields.push('phone');
             if (!finalAccumulatedInfo.email) missingFields.push('email');
             return {
                 type: 'PARTIAL_CONTACT_INFO_PROVIDED',
                 contactInfo: finalAccumulatedInfo, // Pass back the latest accumulated info
                 missingFields: missingFields 
             };
        }
    }

    console.log(`[Classifier ${sessionId}] Proceeding to check other intents.`);

    // Check for complete contact info in the current message ONLY if bot didn't just ask
    const singleMessageContactInfo = extractContactInfo(message);
    if (singleMessageContactInfo && singleMessageContactInfo.name && singleMessageContactInfo.phone) {
        return {
            type: 'CONTACT_INFO_PROVIDED',
            contactInfo: singleMessageContactInfo,
            service: findServiceNameInMessage(message, services)
        };
    }
    // NEW: Check for *partial* contact info in the current message, even if bot didn't just ask
    else if (singleMessageContactInfo && (singleMessageContactInfo.name || singleMessageContactInfo.phone || singleMessageContactInfo.email)) {
        // If we extracted *anything* from this single message, treat it as partial.
        const missingFields = [];
        if (!singleMessageContactInfo.name) missingFields.push('name');
        if (!singleMessageContactInfo.phone) missingFields.push('phone');
        if (!singleMessageContactInfo.email) missingFields.push('email');
        return {
            type: 'PARTIAL_CONTACT_INFO_PROVIDED',
            contactInfo: singleMessageContactInfo,
            missingFields: missingFields
        };
    }

    // --- Other Intent Checks (Prioritize more specific intents) ---
    if (URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'URGENT_APPOINTMENT_REQUEST' };
    }

    if (OPERATING_HOURS_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'OPERATING_HOURS_INQUIRY' };
    }

     if (RESCHEDULE_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'RESCHEDULE_REQUEST' };
    }

     if (CANCEL_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'CANCEL_REQUEST' };
    }
    
    if (availabilityKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'APPOINTMENT_REQUEST' }; 
    }

    if (appointmentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'APPOINTMENT_REQUEST' };
    }

    if (paymentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[DEBUG][messageClassifier.js] PAYMENT_PLAN_INQUIRY matched for message:', message);
        return { type: 'PAYMENT_PLAN_INQUIRY' };
    }

    // --- NEW ORDER: Check for specific service inquiries FIRST ---
    const faqMatch = checkServiceFAQ(normalizedMessage, services);
    if (faqMatch) {
        return { type: 'SERVICE_FAQ', serviceName: faqMatch.serviceName, questionType: faqMatch.questionType };
    }

    // Check for explicit service inquiry keywords ("interested in", "about", "want")
    const mentionedServiceNameExplicit = findServiceNameInMessage(normalizedMessage, services); // Call it once here
    if (serviceInquiryKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        if (mentionedServiceNameExplicit) { 
            return { type: 'SERVICE_INQUIRY_EXPLICIT', serviceName: mentionedServiceNameExplicit }; // Add service name
        }
    }
    
    // --- Check for general service list request only AFTER specific checks ---
    const potentiallySpecific = faqMatch || mentionedServiceNameExplicit;
    
    if (!potentiallySpecific && listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    // Check for help requests (questions asking for help, assistance, etc.)
    if (normalizedMessage.includes('help') && 
        (normalizedMessage.includes('how') || 
         normalizedMessage.includes('can you') || 
         normalizedMessage.includes('could you') || 
         normalizedMessage.includes('what') || 
         normalizedMessage.includes('tell me') || 
         normalizedMessage.includes('explain') || 
         normalizedMessage.includes('show me'))) {
        return { type: 'HELP_REQUEST' };
    }

    // Check for general service interest or "how can you help" type questions
    if ((normalizedMessage.includes('how') && normalizedMessage.includes('help')) ||
        (normalizedMessage.includes('what') && normalizedMessage.includes('do')) ||
        (normalizedMessage.includes('can you') && (normalizedMessage.includes('help') || normalizedMessage.includes('do'))) ||
        (normalizedMessage.includes('services') && (normalizedMessage.includes('offer') || normalizedMessage.includes('have') || normalizedMessage.includes('provide')))) {
        return { type: 'SERVICE_INTEREST' };
    }

    // Check for confirmation keywords ONLY if the bot didn't just ask for contact
    // AND the message is actually a confirmation, not a question
    if (!botRequestedContact && 
        CONFIRMATION_KEYWORDS.some(keyword => normalizedMessage.startsWith(keyword) || normalizedMessage.endsWith(keyword)) &&
        !normalizedMessage.includes('how') && 
        !normalizedMessage.includes('what') && 
        !normalizedMessage.includes('when') && 
        !normalizedMessage.includes('where') && 
        !normalizedMessage.includes('why') && 
        !normalizedMessage.includes('can you') && 
        !normalizedMessage.includes('could you') && 
        !normalizedMessage.includes('would you') && 
        !normalizedMessage.includes('help') && 
        !normalizedMessage.includes('tell me') && 
        !normalizedMessage.includes('explain') && 
        !normalizedMessage.includes('show me') && 
        !normalizedMessage.includes('give me') && 
        !normalizedMessage.includes('?') && 
        normalizedMessage.length < 20) { // Only short confirmations
        return { type: 'CONFIRMATION_YES' };
    }

    // Check for factual questions (e.g., 'what is', 'how does', etc.)
    if (
      normalizedMessage.startsWith('what is') ||
      normalizedMessage.startsWith('how does') ||
      normalizedMessage.startsWith('tell me about') ||
      normalizedMessage.startsWith('explain') ||
      normalizedMessage.startsWith('can you explain') ||
      normalizedMessage.startsWith('describe')
    ) {
      return { type: 'FACTUAL_QUESTION' };
    }

    // Check for Dental Problems
    const problemCheck = checkDentalProblem(normalizedMessage);
    if (problemCheck.isProblem) {
        return {
            type: 'DENTAL_PROBLEM',
            category: problemCheck.category,
            severity: problemCheck.severity
        };
    }

    // Check for Greeting
    if (GREETINGS.some(greeting => normalizedMessage.startsWith(greeting))) {
        return { type: 'GREETING' };
    }

    // Check for specific service consultation requests
    const serviceConsultationRegex = /(?:i want|i need|can i get|i would like|i\'d like|i am interested in|i\'m interested in|i\'d love|i\'m looking for|i\'d want|i\'d need|i\'d get|i\'d schedule|i\'d book|book me|schedule me|consultation about|consultation for|appointment for|appointment about)\s+([a-zA-Z\s]+)/i;
    const serviceConsultationMatch = normalizedMessage.match(serviceConsultationRegex);
    if (serviceConsultationMatch) {
      const requestedService = serviceConsultationMatch[1]?.trim();
      if (requestedService) {
        return { type: 'SERVICE_CONSULTATION_REQUEST', serviceName: requestedService };
      }
    }

    // At the end, before returning default intent
    //console.log('[DEBUG][messageClassifier.js] Default intent for message:', message);

    // Fallback
    return { type: 'UNKNOWN' };
}; 