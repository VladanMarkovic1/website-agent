import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import Contact from "../../models/Contact.js";
import Selector from "../../models/Selector.js";
import { saveLead } from "../leadControllers/leadController.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";
import { generateAIResponse } from "./openaiService.js";
import { getOrCreateSession, updateSessionData, addMessagesToSession } from "./sessionService.js";
import { detectRequestTypes } from "./requestTypeDetector.js";
import { applyResponseOverrides } from "./overrideService.js";
import { redactPII } from '../../utils/piiFilter.js';
import { extractContactInfo, extractExtraDetails } from "./extractContactInfo.js";
import Lead from '../../models/Lead.js';
import businessContextBuilder from '../../services/businessContextBuilder.js';
import util from 'util';

// Removed session map, timeout, cleanup (moved to sessionService)

// Fetch comprehensive business context using the enhanced builder
async function _getBusinessContext(businessId, sessionId, message) {
    try {
        const businessContext = await businessContextBuilder.buildBusinessContext(businessId, sessionId, message);
        return businessContext;
    } catch (error) {
        throw new Error(`Failed to build business context: ${error.message}`);
    }
}

// --- Helper Functions --- 

async function _initializeSessionAndTrackStart(sessionId, businessId) {
    const { session, isNew: isNewSession } = await getOrCreateSession(sessionId, businessId);
    if (session.isFirstMessage) {
        try {
            await trackChatEvent(businessId, 'NEW_CONVERSATION');
            await updateSessionData(sessionId, { isFirstMessage: false }); 
        } catch (error) {
            // Keep essential error logs
        }
    }
    return { session, isNewSession };
}

async function _detectAndSetInitialServiceInterest(session, businessContext, message) {
    if (session.serviceInterest) return; // Already set

    const messageLower = message.toLowerCase();
    const services = businessContext.services?.services || [];
    
    const mentionedService = services.find(service => {
        if (!service || !service.name) return false;
        const serviceName = service.name.toLowerCase();
        return messageLower.includes(serviceName) || 
               serviceName.split(' ').every(word => messageLower.includes(word.toLowerCase()));
    });

    if (mentionedService) {
        await updateSessionData(session.sessionId, { serviceInterest: mentionedService.name });
        session.serviceInterest = mentionedService.name; // Update local session object too
    }
}

async function _generateAndRefineResponse(message, businessContext, sessionMessages, isNewSession, session, previousPartialInfo, language) {
    // Map businessContext.business.businessHours to businessData.operatingHours (string)
    function getOperatingHoursString(businessHours) {
        if (!businessHours) return undefined;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.map((day, i) => {
            const h = businessHours[day];
            if (!h) return `${dayNames[i]}: Closed`;
            if (h.closed) return `${dayNames[i]}: Closed`;
            return `${dayNames[i]}: ${h.open} - ${h.close}`;
        }).join('\n');
    }

    const businessData = {
        ...businessContext,
        operatingHours: getOperatingHoursString(businessContext.businessHours),
        // add other mappings as needed
    };
    
    // Pass session.serviceInterest as an argument
    const aiResult = await generateAIResponse(
        message, 
        businessData, 
        sessionMessages, 
        isNewSession, 
        previousPartialInfo,
        session.serviceInterest,
        language
    );
    const classifiedIntent = aiResult.classifiedIntent; // Original classification
    const initialResponsePayload = aiResult.responsePayload; // Payload after internal logic/switch in generateAIResponse

    // --- First Override Pass (Based on the response payload type from generateAIResponse) ---
    let responseAfterOverride1 = applyResponseOverrides(initialResponsePayload, [], session, businessContext);

    // Update session interest if override specified it
    // --- MODIFIED LOGIC: Be more careful about overwriting existing specific interest ---
    const newServiceContext = responseAfterOverride1.serviceContext;
    const currentServiceInterest = session.serviceInterest;
    const genericPlaceholders = ['your dental needs', 'dental consultation', 'general inquiry', null]; // Include null
    
    // Update only if: 
    // 1. We don't have a current specific interest OR
    // 2. The new context is specific and different from the current one (less common case)
    if (newServiceContext && 
        (!currentServiceInterest || genericPlaceholders.includes(currentServiceInterest.toLowerCase())) && 
        !genericPlaceholders.includes(newServiceContext.toLowerCase())) 
    {
        await updateSessionData(session.sessionId, { serviceInterest: newServiceContext });
        session.serviceInterest = newServiceContext; // Update local session object
    }
    // --- END MODIFIED LOGIC ---
    
    // Return both the potentially overridden payload and the original classified intent
    return { classifiedIntent, responsePayload: responseAfterOverride1 }; 
}

async function _trackProblemDescriptionIfNeeded(session, message, botNextResponseType, userMessageIntentType) {
    // Types of user messages that should NOT overwrite an existing problemDescription if one is already set
    const nonOverwritingUserIntentTypes = [
        'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES', 'CONFIRMATION_NO', 
        'SMALLTALK', 'GREETING', 'GOODBYE', 
        'CONTACT_INFO', 'PARTIAL_CONTACT_INFO_PROVIDED', 'CONTACT_INFO_PROVIDED',
        'REQUEST_HUMAN_AGENT', 'THANKS'
    ];

    if (session.problemDescription && 
        userMessageIntentType && nonOverwritingUserIntentTypes.includes(userMessageIntentType.toUpperCase())) {
        return; 
    }

    // Improved name detection regex patterns
    const namePatterns = [
        /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,  // Basic name pattern (e.g., "John Smith")
        /^[A-Z][a-z]+$/,                      // Single name (e.g., "John")
        /^(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,  // Names with titles
        /^[A-Z][a-z]+(?:\s+(?:van|de|der|den|dos|das|do|da|von|el|al|bin|ibn)\s+[A-Z][a-z]+)*$/  // Names with particles
    ];

    // Check if the message looks like just a name
    const isLikelyName = namePatterns.some(pattern => pattern.test(message.trim()));
    if (isLikelyName) {
        return; // Skip storing if it looks like just a name
    }

    // Original logic for setting problemDescription based on bot's next response type and message content
    const isPotentiallyRelevant = 
        !['CONTACT_INFO', 'CONTACT_INFO_PROVIDED', 'GREETING', 'SMALLTALK', 'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES'].includes(botNextResponseType) &&
        (message.split(' ').length > 3);

    if (isPotentiallyRelevant) {
        const redactedMessage = redactPII(message);
        // Only update if it's different or new, or if no problemDescription was set yet
        if (!session.problemDescription || session.problemDescription !== redactedMessage) {
            await updateSessionData(session.sessionId, { problemDescription: redactedMessage }); 
            session.problemDescription = redactedMessage;
        }
    }
}

// Helper function to determine the lead problem context/concern
async function _determineLeadProblemContext(session, businessContext) {
    const genericPlaceholders = ['your dental needs', 'dental consultation', 'general inquiry', null];
    const specificServiceInterest = session.serviceInterest && !genericPlaceholders.includes(session.serviceInterest.toLowerCase())
                                    ? session.serviceInterest
                                    : null;

    // More robust name detection patterns from _trackProblemDescriptionIfNeeded
    const namePatterns = [
        /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,
        /^[A-Z][a-z]+$/,
        /^(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,
        /^[A-Z][a-z]+(?:\s+(?:van|de|der|den|dos|das|do|da|von|el|al|bin|ibn)\s+[A-Z][a-z]+)*$/
    ];

    const isJustName = (text) => namePatterns.some(pattern => pattern.test(text.trim()));

    // Use business context for contact information
    const contactInfo = businessContext.contact || {};
    const businessPhone = contactInfo.phone;
    const businessEmail = contactInfo.email;
    const businessAddress = contactInfo.address;

    return {
        specificServiceInterest,
        problemDescription: session.problemDescription && !isJustName(session.problemDescription) 
                           ? session.problemDescription 
                           : null,
        businessPhone,
        businessEmail,
        businessAddress
    };
}

async function _handleLeadSavingIfNeeded(message, finalResponse, session, classifiedIntent) {
    // Check for complete contact info (name + phone are required, email is optional)
    const hasCompleteContactInfo = classifiedIntent && 
        classifiedIntent.type === 'CONTACT_INFO_PROVIDED' && 
        classifiedIntent.contactInfo &&
        classifiedIntent.contactInfo.name && 
        classifiedIntent.contactInfo.phone;
    
    // Also check for partial contact info that might be complete enough
    const hasPartialContactInfo = classifiedIntent && 
        classifiedIntent.type === 'PARTIAL_CONTACT_INFO_PROVIDED' && 
        classifiedIntent.contactInfo &&
        classifiedIntent.contactInfo.name && 
        classifiedIntent.contactInfo.phone;
    
    if (!hasCompleteContactInfo && !hasPartialContactInfo) {
        return false; // No lead saved
    }
    
    try {
        // --- Get Business Data (Needed for context determination) --- 
        const businessContext = await _getBusinessContext(session.businessId, session.sessionId, message);
        // ----------------------------------------------------------

        // Determine context using the revised function, passing businessContext
        const leadProblemContext = await _determineLeadProblemContext(session, businessContext);

        // Extract PII to be sent to saveLead (which handles encryption)
        const leadPii = classifiedIntent.contactInfo; 

        // Extract details from the current message first, as it's the most relevant.
        let extraDetails = extractExtraDetails(message);

        // Then, go through history to fill in any details that might be missing.
        if (session.messages && session.messages.length > 0) {
            // Go through all user messages to collect extra details, starting from the most recent
            for (const msg of session.messages.slice().reverse()) {
                if (msg.role === 'user' && msg.content) {
                    const messageDetails = extractExtraDetails(msg.content);
                    // Merge details, filling in gaps from older messages
                    if (messageDetails.concern && !extraDetails.concern) extraDetails.concern = messageDetails.concern;
                    if (messageDetails.timing && !extraDetails.timing) extraDetails.timing = messageDetails.timing;
                    if (messageDetails.days && !extraDetails.days) extraDetails.days = messageDetails.days;
                    if (messageDetails.time && !extraDetails.time) extraDetails.time = messageDetails.time;
                    if (messageDetails.insurance && !extraDetails.insurance) extraDetails.insurance = messageDetails.insurance;
                }
            }
        }
        
        // Determine service interest
        const serviceInterest = extraDetails.concern || session.serviceInterest || finalResponse.serviceContext || 'Dental Consultation';
        
        // Remove service/concern from extraDetails to avoid duplication
        const { concern, ...otherDetails } = extraDetails;

        const leadContext = {
            businessId: session.businessId,
            name: leadPii.name, 
            phone: leadPii.phone,
            email: leadPii.email,
            serviceInterest: serviceInterest,
            problemDescription: leadProblemContext.problemDescription,
            messageHistory: session.messages,
            details: otherDetails // Only include other details, not the service
        };
        await saveLead(leadContext);
        await updateSessionData(session.sessionId, { contactInfo: leadPii });
        session.contactInfo = leadPii;
        await updateSessionData(session.sessionId, { partialContactInfo: null });
        session.partialContactInfo = null; 
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: serviceInterest });
        return true; // Lead was saved
    } catch (error) {
         // Keep essential error log
         return false;
    }
}

async function _logInteractionMessages(sessionId, userMessageContent, userMessageType, finalResponse) {
    // Only redact for logging, not for user-facing response
     const userMessageLog = {
        role: 'user',
        content: redactPII(userMessageContent),
        timestamp: Date.now(),
        type: userMessageType,
    };
    const botMessageLog = {
        role: 'assistant',
        content: finalResponse.response, // Do NOT redact for user-facing response
        timestamp: Date.now(),
        type: finalResponse.type,
        problemCategory: finalResponse.problemCategory || null
    };
    await addMessagesToSession(sessionId, userMessageLog, botMessageLog);
    // Also store the last bot response type in the session for context checking
    try {
        await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
    } catch(err) {
        // Keep essential error log
    }
}

async function _trackConversationCompletionIfNeeded(finalResponse, session) {
    if (finalResponse.type === 'GOODBYE' && session.contactInfo) { // Assuming a GOODBYE type exists
        try {
            await trackChatEvent(session.businessId, 'CONVERSATION_COMPLETED');
        } catch (error) {
            // Keep essential error log
        }
    }
}

// Utility to escape HTML characters for preventing XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Main Orchestrator Function --- 

const processChatMessage = async (message, sessionId, businessId, language = 'en') => {
    try {
        const { session, isNewSession } = await _initializeSessionAndTrackStart(sessionId, businessId);
        const businessContext = await _getBusinessContext(businessId, session.sessionId, message);

        // Detect initial service interest (if not already set)
        await _detectAndSetInitialServiceInterest(session, businessContext, message);

        // Prepare message history (use session.messages)
        const sessionMessages = session.messages || [];
        const previousPartialInfo = session.partialContactInfo || { name: null, phone: null, email: null };

        // Generate response (AI + Overrides)
        const { classifiedIntent, responsePayload } = await _generateAndRefineResponse(
            message, 
            businessContext, 
            sessionMessages, 
            isNewSession, 
            session,
            previousPartialInfo,
            language
        );

        // --- Second Override Pass (Based on user message type) --- 
        const userMessageTypes = detectRequestTypes(message);
        const finalResponse = applyResponseOverrides(responsePayload, userMessageTypes, session, businessContext); 

        // Always use a single, natural message for appointment/booking/visit requests (after all overrides)
        const appointmentKeywords = [
            'appointment', 'appointments', 'appoinment', 'book', 'schedule', 'check in', 'check availability',
            'see the doctor', 'see dr', 'make an appointment',
            'can i come', 'can i visit', 'can i stop by', 'can i drop in', 'can i come today', 'can i come tomorrow', 'can i visit today', 'can i visit tomorrow', 'can i book for', 'can i get in', 'can i see you', 'can i see the dentist', 'can i see dr', 'can i get an appointment', 'can i get a slot', 'can i get scheduled', 'can i get in today', 'can i get in tomorrow'
        ];
        const normalizedMessage = message.toLowerCase();
        const isAppointmentRequest = appointmentKeywords.some(keyword => normalizedMessage.includes(keyword));
        if (isAppointmentRequest) {
            finalResponse.response = "Just so you know, I don't have access to a live calendar to confirm real-time availability. However, I can arrange for our team to call you and finalize your appointment. To proceed, could you please provide your full name, phone number, and email address?";
        }

        // --- Store/Update Partial Contact Info in Session ---
        if (classifiedIntent?.type === 'PARTIAL_CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo) {
             const accumulatedPartialInfo = classifiedIntent.contactInfo;
             if (!session.partialContactInfo || JSON.stringify(session.partialContactInfo) !== JSON.stringify(accumulatedPartialInfo)) {
                  await updateSessionData(sessionId, { partialContactInfo: accumulatedPartialInfo });
                  session.partialContactInfo = accumulatedPartialInfo;
             }
        } else if (classifiedIntent?.type === 'CONTACT_INFO_PROVIDED'){
             // If complete info was provided, ensure partial info is cleared later during lead saving 
        } else if (session.partialContactInfo) {
             // If we have partial info in session, but classifier didn't detect partial/complete this turn
        }
        // --- END Store/Update Partial Contact Info --- 

        // Track problem description if needed 
        await _trackProblemDescriptionIfNeeded(session, message, finalResponse.type, classifiedIntent?.type);

        // --- Handle Lead Saving (Main Logic) ---
        const leadSaved = await _handleLeadSavingIfNeeded(message, finalResponse, session, classifiedIntent);

        // Track conversation end
        await _trackConversationCompletionIfNeeded(finalResponse, session);
        // Log messages (use detected user type)
        const userMessageType = userMessageTypes.length > 0 ? userMessageTypes.join('/') : 'UNKNOWN';
        await _logInteractionMessages(sessionId, message, userMessageType, finalResponse);
        if (finalResponse.type) {
            await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
        }
        return {
             response: escapeHtml(finalResponse.response),
             type: finalResponse.type,
             sessionId
        };
    } catch (error) {
         return {
             response: escapeHtml("I apologize, but I'm having trouble processing your request right now. Please try again or contact our team directly."),
             type: 'ERROR',
             sessionId: sessionId || 'unknown'
         };
    }
};

// HTTP endpoint handler 
export const handleChatMessage = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { message, sessionId } = req.body;
        
        if (!businessId) {
            return res.status(400).json({ error: "Business ID is missing in the URL" });
        }
        const response = await processChatMessage(message, sessionId, businessId);
        res.json(response);
    } catch (error) {
        res.status(error.message === "Business not found" ? 404 : 500).json({ 
            error: error.message || "An error occurred while processing your message" 
        });
    }
};

// WebSocket message processor 
export const processWebSocketMessage = async (message, sessionId, businessId, language = 'en') => {
    try {
        return await processChatMessage(message, sessionId, businessId, language);
    } catch (error) {
        return {
            type: "error",
            response: error.message || "An error occurred while processing your message"
        };
    }
};

