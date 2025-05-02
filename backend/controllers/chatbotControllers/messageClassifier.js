import { GREETINGS, DENTAL_PROBLEMS, URGENT_KEYWORDS, RESPONSE_TEMPLATES, SERVICE_FAQ_KEYWORDS, OPERATING_HOURS_KEYWORDS, RESCHEDULE_KEYWORDS, CANCEL_KEYWORDS, CONFIRMATION_KEYWORDS } from './chatbotConstants.js';
import { extractContactInfo } from './extractContactInfo.js';

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
    'see the doctor', 'see dr', 'make an appointment'
];

// Keywords for Availability Inquiries (Higher Priority than List Services)
const availabilityKeywords = [
    'weekend', 'saturday', 'sunday', 
    'noon', 'afternoon', 'evening', 'morning',
    'hours', 'available', 'availability', 'when',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'time',
    // Add common misspellings if needed, e.g., 'appoinment', 'appointmet'
];

// Keywords indicating a request to list available services
const listServiceKeywords = [
    'list services', 'what services', 'which services', 'do you offer', 'your services',
    'list service'
];

// Keywords indicating potential service inquiry
const serviceInquiryKeywords = ['interested in', 'about', 'want'];

// Helper function to find a matching service name in the message
// (More robust matching might be needed depending on service name complexity)
export const findServiceNameInMessage = (normalizedMsg, services = []) => {
    // console.log(`[findServiceName] Searching for service in: "${normalizedMsg}"`);
    // console.log(`[findServiceName] Available services:`, services.map(s => s?.name));
    if (!services || services.length === 0) return null;

    const messageWords = new Set(normalizedMsg.split(/[\s,&]+/));

    const foundService = services.find(service => {
        const serviceName = service?.name;
        if (!serviceName) return false;

        // --- ADDED: Decode HTML entities REPEATEDLY --- 
        let decodedServiceName = serviceName;
        let loopCount = 0; // Debugging loop counter
        // console.log(`[findServiceName Debug] Initial serviceName: "${decodedServiceName}"`);
        while (decodedServiceName.includes('&amp;') && loopCount < 10) { // Add loop limit for safety
             // console.log(`[findServiceName Debug] Before replace #${loopCount + 1}: "${decodedServiceName}"`);
             decodedServiceName = decodedServiceName.replace(/&amp;/g, '&');
             // console.log(`[findServiceName Debug] After replace #${loopCount + 1}: "${decodedServiceName}"`);
             loopCount++;
        }
        // console.log(`[findServiceName Debug] Final decoded service name after loop: "${decodedServiceName}"`);
        // --- END DECODING --- 

        const serviceNameLower = decodedServiceName.toLowerCase();
        // console.log(`[findServiceName] Checking against service: "${serviceNameLower}"`);

        // Option 1: Simple substring check
        if (normalizedMsg.includes(serviceNameLower)) {
            return true;
        }

        // Option 2: Word-based check
        const serviceNameWords = serviceNameLower.split(/[\s,&]+/).filter(Boolean);
        if (serviceNameWords.length > 0 && serviceNameWords.every(word => messageWords.has(word))) {
             return true;
        }

        return false; // No match
    });

    // console.log(`[findServiceName] Found service: ${foundService?.name || null}`);
    // Return the ORIGINAL service name from the DB if found
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

    // Combine all FAQ keywords
    const questionKeywords = [
        ...SERVICE_FAQ_KEYWORDS.pain, 
        ...SERVICE_FAQ_KEYWORDS.duration, 
        ...SERVICE_FAQ_KEYWORDS.cost
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
    const sessionId = messageHistory[0]?.sessionId || 'unknown'; // Helper to get session ID for logging

    // ---- START DEBUG LOGGING ----
    console.log(`
--- INTENT CHECK START (Session: ${sessionId}) ---`);
    console.log(`User Message: "${normalizedMessage}"`);
    console.log(`Services Available (Names):`, services.map(s => s?.name)); // Log service names
    console.log(`Last Bot Msg Type: ${lastBotMessage?.type}`);
    // ---- END DEBUG LOGGING ----

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

    console.log(`[Classifier ${sessionId}] Last Bot Msg Type: ${lastBotMessage?.type}, Bot Requested Contact Flag: ${botRequestedContact}`); // Log flag check

    if (botRequestedContact) {
        console.log(`[Classifier ${sessionId}] Entering contact accumulation block.`);
        // Accumulate contact info from history AFTER the bot's request
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
        console.log(`[Classifier ${sessionId}] History slice to check for accumulation (length ${historyToCheck.length}):`, historyToCheck.map(m=>m.content)); // Log messages being checked

        historyToCheck.forEach(userMsg => {
            const extractedFromMsg = extractContactInfo(userMsg.content);
            console.log(`[Classifier ${sessionId}] Extracted from "${userMsg.content}":`, extractedFromMsg); // Log extraction result
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

        console.log(`[Classifier ${sessionId}] Final Accumulated Info before check:`, finalAccumulatedInfo); // Log final accumulated info
        console.log(`[Classifier ${sessionId}] Extracted something this turn: ${extractedSomethingThisTurn}`); // Log flag

        // Check if accumulated info is now complete
        const isComplete = finalAccumulatedInfo.name && finalAccumulatedInfo.phone && finalAccumulatedInfo.email;
        console.log(`[Classifier ${sessionId}] Is Complete Check: ${isComplete}`); // Log completeness check

        if (isComplete) {
             console.log(`[Classifier ${sessionId}] ---> Returning type: CONTACT_INFO_PROVIDED`); // Log return type
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
             console.log(`[Classifier ${sessionId}] ---> Returning type: PARTIAL_CONTACT_INFO_PROVIDED (Missing: ${missingFields.join(', ')})`); // Log return type
             return {
                 type: 'PARTIAL_CONTACT_INFO_PROVIDED',
                 contactInfo: finalAccumulatedInfo, // Pass back the latest accumulated info
                 missingFields: missingFields 
             };
        } else {
             console.log(`[Classifier ${sessionId}] Bot requested contact, but accumulation conditions not met for PARTIAL/COMPLETE.`); // Log edge case
        }
    } // End if (botRequestedContact)

    console.log(`[Classifier ${sessionId}] Proceeding to check other intents.`);

    // Check for complete contact info in the current message ONLY if bot didn't just ask
    const singleMessageContactInfo = extractContactInfo(message);
    if (singleMessageContactInfo && singleMessageContactInfo.name && singleMessageContactInfo.phone && singleMessageContactInfo.email) {
         console.log(`[Classifier ${sessionId}] ---> Returning type: CONTACT_INFO_PROVIDED (Single Message)`);
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
        console.log(`[Classifier ${sessionId}] ---> Returning type: PARTIAL_CONTACT_INFO_PROVIDED (Single Message, Missing: ${missingFields.join(', ')})`);
        return {
            type: 'PARTIAL_CONTACT_INFO_PROVIDED',
            contactInfo: singleMessageContactInfo,
            missingFields: missingFields
        };
    }

    // --- Other Intent Checks (Prioritize more specific intents) ---
    if (URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
         console.log(`[Classifier ${sessionId}] ---> Returning type: URGENT_APPOINTMENT_REQUEST`);
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

    // --- NEW ORDER: Check for specific service inquiries FIRST ---
    const faqMatch = checkServiceFAQ(normalizedMessage, services);
    if (faqMatch) {
        console.log(`[Classifier ${sessionId}] ---> Returning type: SERVICE_FAQ (Service: ${faqMatch.serviceName})`);
        return { type: 'SERVICE_FAQ', serviceName: faqMatch.serviceName, questionType: faqMatch.questionType };
    }

    // Check for explicit service inquiry keywords ("interested in", "about", "want")
    const mentionedServiceNameExplicit = findServiceNameInMessage(normalizedMessage, services); // Call it once here
    if (serviceInquiryKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        if (mentionedServiceNameExplicit) { 
            console.log(`[Classifier ${sessionId}] ---> Returning type: SERVICE_INQUIRY_EXPLICIT (Service: ${mentionedServiceNameExplicit})`);
            return { type: 'SERVICE_INQUIRY_EXPLICIT', serviceName: mentionedServiceNameExplicit }; // Add service name
        }
    }
    
    // --- Check for general service list request only AFTER specific checks ---
    const potentiallySpecific = faqMatch || mentionedServiceNameExplicit; // Reuse the result from above
    console.log(`[Classifier ${sessionId}] --- DEBUG FOR LIST CHECK ---`);
    console.log(`       faqMatch: ${JSON.stringify(faqMatch)}`);
    console.log(`       mentionedServiceNameExplicit: "${mentionedServiceNameExplicit}"`);
    console.log(`       potentiallySpecific is truthy?: ${!!potentiallySpecific}`);
    console.log(`       Does message include list keyword?: ${listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))}`);
    console.log(`       Combined condition (!potentiallySpecific && includesListKeyword): ${!potentiallySpecific && listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))}`);
    console.log(`[Classifier ${sessionId}] --- END DEBUG FOR LIST CHECK ---`);
    
    if (!potentiallySpecific && listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log(`[Classifier ${sessionId}] ---> Returning type: REQUEST_SERVICE_LIST`);
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    // --- Continue with other checks ---
    // Check for confirmation keywords ONLY if the bot didn't just ask for contact
    if (!botRequestedContact && CONFIRMATION_KEYWORDS.some(keyword => normalizedMessage.startsWith(keyword) || normalizedMessage.endsWith(keyword))) {
        console.log(`[Classifier ${sessionId}] ---> Returning type: CONFIRMATION_YES`);
        return { type: 'CONFIRMATION_YES' };
    }

    // Check for Dental Problems
    const problemCheck = checkDentalProblem(normalizedMessage);
    if (problemCheck.isProblem) {
        console.log(`[Classifier ${sessionId}] ---> Returning type: DENTAL_PROBLEM (Category: ${problemCheck.category})`);
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

    // Fallback
    console.log(`[Classifier ${sessionId}] ---> Returning type: UNKNOWN`); // Log return type
    return { type: 'UNKNOWN' };
}; 