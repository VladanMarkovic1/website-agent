import { GREETINGS, DENTAL_PROBLEMS, URGENT_KEYWORDS, RESPONSE_TEMPLATES, SERVICE_FAQ_KEYWORDS, OPERATING_HOURS_KEYWORDS } from './chatbotConstants.js';
import { extractContactInfo } from './extractContactInfo.js';

const isGreeting = (normalizedMsg) => {
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && normalizedMsg.length < 20;
};

const isDentalProblem = (normalizedMsg) => {
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isIssue: true,
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    return { isIssue: false };
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
    'list service', 'what service', 'which service'
];

// Keywords indicating potential service inquiry
const serviceInquiryKeywords = ['interested in', 'about', 'want'];

// Helper function to find a matching service name in the message
// (More robust matching might be needed depending on service name complexity)
export const findServiceNameInMessage = (normalizedMsg, services = []) => {
    if (!services || services.length === 0) return null;
    // Find the first service whose name appears in the message
    const foundService = services.find(service => 
        service.name && normalizedMsg.includes(service.name.toLowerCase())
    );
    return foundService ? foundService.name : null;
};

// Helper function to determine the type of question asked
const getQuestionType = (normalizedMsg) => {
    if (SERVICE_FAQ_KEYWORDS.pain.some(kw => normalizedMsg.includes(kw))) return 'pain';
    if (SERVICE_FAQ_KEYWORDS.duration.some(kw => normalizedMsg.includes(kw))) return 'duration';
    if (SERVICE_FAQ_KEYWORDS.cost.some(kw => normalizedMsg.includes(kw))) return 'cost';
    return 'details'; // Default if specific keywords not found but pattern matches
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
export const classifyUserIntent = (message, messageHistory = [], services = [], isNewSession = false, previousPartialInfo = { name: null, phone: null, email: null }) => {
    const normalizedMessage = message.toLowerCase().trim();
    const lastBotMessage = messageHistory.filter(msg => msg.role === 'assistant').pop();

    // --- NEW: Contact Info Accumulation Logic ---
    if (lastBotMessage && didBotRequestContactInfo(lastBotMessage.content)) {
        console.log('[Classifier] Bot requested contact info. Checking history with previous info:', previousPartialInfo);
        
        // Initialize with the state passed from the controller
        let finalAccumulatedInfo = { 
            name: previousPartialInfo.name, 
            phone: previousPartialInfo.phone, 
            email: previousPartialInfo.email 
        };
        let historyToCheck = [];

        // Find the index of the last bot request that asked for info
        let lastBotRequestIndex = -1;
        for (let i = messageHistory.length - 1; i >= 0; i--) {
            if (messageHistory[i].role === 'assistant' && didBotRequestContactInfo(messageHistory[i].content)) {
                lastBotRequestIndex = i;
                break;
            }
        }

        if (lastBotRequestIndex !== -1) {
            historyToCheck = messageHistory.slice(lastBotRequestIndex + 1).filter(msg => msg.role === 'user');
        }
        historyToCheck.push({ role: 'user', content: message }); // Add current message

        // Process messages to accumulate info
        console.log('[Classifier] Messages being checked for accumulation:', historyToCheck.map(m=>m.content));
        let extractedSomethingThisTurn = false; // Flag if any info was extracted from the messages checked
        for (const userMsg of historyToCheck) {
            const extractedFromMsg = extractContactInfo(userMsg.content); 
            console.log(`[Classifier Loop] Processing msg: "${userMsg.content}"`); // Log message being processed
            console.log(`[Classifier Loop] Result of extractContactInfo:`, extractedFromMsg); // Log extraction result
            
            if (extractedFromMsg) {
                 // Combine with existing accumulated info, prioritizing already filled fields
                 const previousName = finalAccumulatedInfo.name;
                 const previousPhone = finalAccumulatedInfo.phone;
                 const previousEmail = finalAccumulatedInfo.email;
                 
                 finalAccumulatedInfo.name = finalAccumulatedInfo.name || extractedFromMsg.name;
                 finalAccumulatedInfo.phone = finalAccumulatedInfo.phone || extractedFromMsg.phone;
                 finalAccumulatedInfo.email = finalAccumulatedInfo.email || extractedFromMsg.email;
                 
                 console.log(`[Classifier Loop] Accumulated info after merge:`, finalAccumulatedInfo); // Log merged info
                 
                 // Check if the extraction actually yielded *new* data compared to before merge for THIS message
                 if ((extractedFromMsg.name && !previousName) || 
                     (extractedFromMsg.phone && !previousPhone) || 
                     (extractedFromMsg.email && !previousEmail)) {
                     extractedSomethingThisTurn = true;
                     console.log(`[Classifier Loop] Set extractedSomethingThisTurn = true`); // Log flag set
                 }
            }
        }
        console.log(`[Classifier Loop] Finished processing messages. Final accumulated:`, finalAccumulatedInfo); // Log after loop
        console.log(`[Classifier Loop] Final extractedSomethingThisTurn:`, extractedSomethingThisTurn); // Log flag after loop

        // Check if complete (based on combined info)
        const isComplete = finalAccumulatedInfo.name && finalAccumulatedInfo.phone && finalAccumulatedInfo.email;
        const foundAny = finalAccumulatedInfo.name || finalAccumulatedInfo.phone || finalAccumulatedInfo.email;

        if (isComplete) {
            console.log('[Classifier] Accumulated complete contact info:', finalAccumulatedInfo);
            return {
                type: 'CONTACT_INFO_PROVIDED',
                contactInfo: finalAccumulatedInfo
            };
        } else if (foundAny && extractedSomethingThisTurn) { 
            // Return PARTIAL if: 
            // 1. Bot asked for info (we are in this block)
            // 2. We have at least one piece of info (foundAny)
            // 3. We actually extracted *some* info from the message(s) processed this turn (extractedSomethingThisTurn)
            const missingFields = ['name', 'phone', 'email'].filter(field => !finalAccumulatedInfo[field]);
            console.log('[Classifier] Accumulated partial contact info after check:', finalAccumulatedInfo, 'Missing:', missingFields);
            return {
                type: 'PARTIAL_CONTACT_INFO_PROVIDED',
                contactInfo: finalAccumulatedInfo, 
                missingFields: missingFields
            };
        } 
        // If bot asked, but processing messages resulted in no useful info OR didn't complete the set, fall through.
        console.log('[Classifier] Bot asked, but processing did not result in complete info or no relevant info extracted this turn. Falling through.');
    }
    // --- END NEW Logic ---


    // 1. Check for Contact Info Provided (NOW ONLY A FALLBACK for single message input)
    // This might still be useful if the accumulation logic fails or if the user provides all at once unexpectedly.
    const singleMessageContactInfo = extractContactInfo(message);
     if (singleMessageContactInfo && singleMessageContactInfo.name && singleMessageContactInfo.phone && singleMessageContactInfo.email) {
        console.log('[Classifier] Found complete contact info in SINGLE message. Classifying as CONTACT_INFO_PROVIDED.');
        return {
            type: 'CONTACT_INFO_PROVIDED',
            contactInfo: singleMessageContactInfo // Use info from the single message
        };
    }

    // 2. Check for Urgency (High priority)
    if (URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found urgency keyword. Classifying as URGENT_APPOINTMENT_REQUEST.');
        return { type: 'URGENT_APPOINTMENT_REQUEST' };
    }

    // --- NEW CHECK 4: Operating Hours Inquiry ---
    if (OPERATING_HOURS_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found operating hours keyword. Classifying as OPERATING_HOURS_INQUIRY.');
        return { type: 'OPERATING_HOURS_INQUIRY' };
    }
    // --- END NEW CHECK 4 ---

    // 5. Check for Availability Keywords (Appointment) 
    if (availabilityKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found availability keyword. Classifying as APPOINTMENT_REQUEST.');
        return { type: 'APPOINTMENT_REQUEST' };
    }

    // 6. Check for General Appointment Keywords
    if (appointmentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found general appointment keyword. Classifying as APPOINTMENT_REQUEST.');
        return { type: 'APPOINTMENT_REQUEST' };
    }
    
    // 7. Check for Request to List Services
    if (listServiceKeywords.some(keyword => normalizedMessage.includes(keyword))) {
        console.log('[Classifier] Found list service keyword. Classifying as REQUEST_SERVICE_LIST.');
        return { type: 'REQUEST_SERVICE_LIST' };
    }

    // --- NEW CHECK 7: Service FAQ ---
    const mentionedServiceName = findServiceNameInMessage(normalizedMessage, services);
    const questionKeywords = [...SERVICE_FAQ_KEYWORDS.pain, ...SERVICE_FAQ_KEYWORDS.duration, ...SERVICE_FAQ_KEYWORDS.cost];
    const isServiceFAQ = mentionedServiceName && questionKeywords.some(kw => normalizedMessage.includes(kw));

    if (isServiceFAQ) {
        const questionType = getQuestionType(normalizedMessage);
        console.log(`[Classifier] Found service FAQ. Service: ${mentionedServiceName}, Type: ${questionType}. Classifying as SERVICE_FAQ.`);
        return {
            type: 'SERVICE_FAQ',
            serviceName: mentionedServiceName,
            questionType: questionType
        };
    }
    // --- END NEW CHECK 7 ---

    // 8. Check for Simple Confirmations (after specific prompts)
    if (lastBotMessage && ('yes' === normalizedMessage || 'sure' === normalizedMessage || 'okay' === normalizedMessage || 'ok' === normalizedMessage)) {
        // Avoid triggering confirmation if the bot just asked for contact info (handled above)
        if (!didBotRequestContactInfo(lastBotMessage.content)) {
             const askedConfirmation = lastBotMessage.content.includes('Would you like') || 
                                       lastBotMessage.content.includes('shall I help') || 
                                       lastBotMessage.content.includes('arrange that');
            if (askedConfirmation) {
                console.log('[Classifier] Found confirmation (not after contact request). Classifying as CONFIRMATION_YES.');
                return { type: 'CONFIRMATION_YES' };
            }
        }
    }

    // 9. Check for Explicit Service Inquiry Keywords
    if (serviceInquiryKeywords.some(kw => normalizedMessage.includes(kw))) {
        console.log('[Classifier] Found explicit service keyword. Classifying as SERVICE_INQUIRY_EXPLICIT.');
        return { type: 'SERVICE_INQUIRY_EXPLICIT' };
    }

    // 10. Check for Follow-up after Dental Problem
    if (lastBotMessage?.type === 'DENTAL_PROBLEM' && 
        (normalizedMessage.includes('which service') || normalizedMessage.includes('what service') || 
         normalizedMessage.includes('can help') || normalizedMessage.includes('what should i do'))) {
        console.log('[Classifier] Found problem followup. Classifying as PROBLEM_FOLLOWUP.');
        return {
            type: 'PROBLEM_FOLLOWUP',
            problemCategory: lastBotMessage.problemCategory 
        };
    }

    // 11. Check for Initial Dental Problem Report
    const dentalProblem = isDentalProblem(normalizedMessage);
    if (dentalProblem.isIssue) {
        console.log('[Classifier] Found dental problem. Classifying as DENTAL_PROBLEM.');
        return {
            type: 'DENTAL_PROBLEM',
            category: dentalProblem.category,
            severity: dentalProblem.severity
        };
    }

    // 12. Check for Greetings (Only based on content, not isNewSession)
    if (isGreeting(normalizedMessage)) {
        console.log('[Classifier] Found greeting content. Classifying as GREETING.');
        return { type: 'GREETING' };
    }

    // 13. If none of the above, classify as Unknown
    console.log('[Classifier] No specific intent matched. Classifying as UNKNOWN.');
    return { type: 'UNKNOWN' };
}; 