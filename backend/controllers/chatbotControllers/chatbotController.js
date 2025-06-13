import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import Contact from "../../models/Contact.js";
import ExtraInfo from "../../models/ExtraInfo.js";
import PhoneSettings from "../../models/PhoneSettings.js";
import Selector from "../../models/Selector.js";
import { saveLead } from "../leadControllers/leadController.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";
import { generateAIResponse } from "./openaiService.js";
import { getOrCreateSession, updateSessionData, addMessagesToSession } from "./sessionService.js";
import { detectRequestTypes } from "./requestTypeDetector.js";
import { applyResponseOverrides } from "./overrideService.js";
import { DENTAL_KEYWORDS_FOR_TRACKING, RESPONSE_TEMPLATES } from "./chatbotConstants.js"; // Import RESPONSE_TEMPLATES too
import { redactPII } from '../../utils/piiFilter.js';

// Removed session map, timeout, cleanup (moved to sessionService)

// Fetch business data (could be further extracted later)
async function _getBusinessData(businessId) {
    const [business, serviceData, contactData, extraInfoData, phoneSettings] = await Promise.all([
        Business.findOne({ businessId }),
        Service.findOne({ businessId }),
        Contact.findOne({ businessId }),
        ExtraInfo.findOne({ businessId }),
        PhoneSettings.findOne({ businessId, status: 'active' })
    ]);

    if (!business) {
        throw new Error("Business not found");
    }

    const services = serviceData?.services?.map(service => ({
        name: service.name,
        description: service.description
    })) || [];

    // Use the real, scraped phone number from Contact
    const businessPhoneNumber = contactData?.phone || null;
    console.log(`[DEBUG] BusinessId: ${businessId} | Contact phone from DB:`, contactData?.phone); // Debug log

    const fullBusinessData = {
        ...business.toObject(),
        services: services,
        businessPhoneNumber: businessPhoneNumber,
        businessEmail: contactData?.email || null,
        address: contactData?.address || null,
        operatingHours: extraInfoData?.operatingHours || null,
        aboutUsText: extraInfoData?.aboutUsText || null
    };
    console.log(`[DEBUG] BusinessId: ${businessId} | businessPhoneNumber passed to chatbot:`, businessPhoneNumber); // Debug log

    // console.log("[Business Data Check] Fetched business data:", JSON.stringify(fullBusinessData, null, 2)); // Debug only - Removed
    return fullBusinessData;
}

// --- Helper Functions --- 

async function _initializeSessionAndTrackStart(sessionId, businessId) {
    const { session, isNew: isNewSession } = await getOrCreateSession(sessionId, businessId);
    if (session.isFirstMessage) {
        try {
            await trackChatEvent(businessId, 'NEW_CONVERSATION');
            await updateSessionData(sessionId, { isFirstMessage: false }); 
        } catch (error) {
            console.error("Error tracking new conversation:", error); // Keep essential error logs
        }
    }
    return { session, isNewSession };
}

async function _detectAndSetInitialServiceInterest(session, businessData, message) {
    if (session.serviceInterest) return; // Already set

    const messageLower = message.toLowerCase();
    const mentionedService = businessData.services.find(service => {
        if (!service || !service.name) return false;
        const serviceName = service.name.toLowerCase();
        return messageLower.includes(serviceName) || 
               serviceName.split(' ').every(word => messageLower.includes(word.toLowerCase()));
    });

    if (mentionedService) {
        await updateSessionData(session.sessionId, { serviceInterest: mentionedService.name });
        // console.log('[Controller] Detected service interest:', mentionedService.name); // Debug only - Removed
        session.serviceInterest = mentionedService.name; // Update local session object too
    }
}

async function _generateAndRefineResponse(message, businessData, sessionMessages, isNewSession, session, previousPartialInfo) {
    // console.log(`[AI Call Prep] Calling generateAIResponse. isNewSession=${isNewSession}. Message: "${redactPII(message)}". History length: ${sessionMessages?.length || 0}`); // Redacted message
    // if (sessionMessages && sessionMessages.length > 0) { // Avoid logging message history in prod
        // console.log(`[AI Call Prep] Last ${Math.min(3, sessionMessages.length)} messages:`, JSON.stringify(sessionMessages.slice(-3), null, 2)); // Requires deep redaction - Removed for prod
    // }
    
    // Pass session.serviceInterest as an argument
    const aiResult = await generateAIResponse(
        message, 
        businessData, 
        sessionMessages, 
        isNewSession, 
        previousPartialInfo,
        session.serviceInterest
    );
    const classifiedIntent = aiResult.classifiedIntent; // Original classification
    const initialResponsePayload = aiResult.responsePayload; // Payload after internal logic/switch in generateAIResponse
    
    // console.log(`[AI Response Log] Original Classified Intent:`, JSON.stringify(classifiedIntent, null, 2)); // Debug - Removed
    // console.log(`[AI Response Log] Initial Response Payload from generateAIResponse:`, JSON.stringify(initialResponsePayload, null, 2)); // Debug - Removed

    // --- First Override Pass (Based on the response payload type from generateAIResponse) ---
    // console.log("[Override Check 1] Applying overrides based on initial response payload type."); // Debug - Removed
    let responseAfterOverride1 = applyResponseOverrides(initialResponsePayload, [], session, businessData);
    // console.log("[Override Check 1] Response after first override pass:", JSON.stringify(responseAfterOverride1, null, 2)); // Debug - Removed

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
        // console.log(`[Override Check 1] Updating session service interest from '${currentServiceInterest}' to '${newServiceContext}'`);
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
        'REQUEST_HUMAN_AGENT', 'THANKS' // Added more types that are generally not new primary concerns
    ];

    if (session.problemDescription && 
        userMessageIntentType && nonOverwritingUserIntentTypes.includes(userMessageIntentType.toUpperCase())) {
        // If a problem description exists, and the current user message is a simple affirmation, contact info, etc.,
        // do NOT overwrite the existing problem description.
        // console.log(`[Session Update] User message type '${userMessageIntentType}' will not overwrite existing problemDescription: "${session.problemDescription}"`);
        return; 
    }

    // Original logic for setting problemDescription based on bot's next response type and message content
    // This uses BOT's next response type (botNextResponseType)
    const isPotentiallyRelevant = 
        !['CONTACT_INFO', 'CONTACT_INFO_PROVIDED', 'GREETING', 'SMALLTALK', 'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES'].includes(botNextResponseType) &&
        (DENTAL_KEYWORDS_FOR_TRACKING.some(keyword => message.toLowerCase().includes(keyword)) || message.split(' ').length > 3);

    if (isPotentiallyRelevant) {
        const redactedMessage = redactPII(message);
        // Only update if it's different or new, or if no problemDescription was set yet
        if (!session.problemDescription || session.problemDescription !== redactedMessage) {
            await updateSessionData(session.sessionId, { problemDescription: redactedMessage }); 
            session.problemDescription = redactedMessage; // Update local session object with redacted
            // console.log(`[Session Update] Updated relevant problemDescription to: "${redactedMessage}"`); 
        }
    } else {
        // Optional: Log if message wasn't relevant (can be noisy)
        // console.log(`[Session Update] Message "${redactPII(message)}" (type: ${botNextResponseType}) not deemed relevant for updating problemDescription.`);
    }
}

// Helper function to determine the lead problem context/concern
async function _determineLeadProblemContext(session, businessData) {
    const genericPlaceholders = ['your dental needs', 'dental consultation', 'general inquiry', null];
    const specificServiceInterest = session.serviceInterest && !genericPlaceholders.includes(session.serviceInterest.toLowerCase())
                                    ? session.serviceInterest 
                                    : null;

    // 1. Prioritize specific service interest
    if (specificServiceInterest) {
        return `Interest in: ${specificServiceInterest}`;
    }

    // 2. Prioritize explicitly tracked problem description
    // Ensure problemDescription is not null/empty AND doesn't look like just a name
    const nameRegex = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/; // Basic name pattern
    if (session.problemDescription && session.problemDescription.trim().length > 0 && !nameRegex.test(session.problemDescription.trim())) {
         return session.problemDescription; // Already redacted
    }

    // 3. Fallback: Simple generic message (Avoid complex history search for now)
    return "User provided contact details after chatbot interaction.";

    /* // --- REMOVED History Search Logic --- 
    // 3. Fallback: Search backwards for first non-trivial message if description wasn't captured
    if (!leadProblemContext) {
        // ... existing history search code ...
    }

    // 4. Final fallback: Generic message
    if (!leadProblemContext) {
        leadProblemContext = "User provided contact details after chatbot interaction.";
    }
    
    return leadProblemContext;
    */ // --- END REMOVED History Search --- 
}

async function _handleLeadSavingIfNeeded(finalResponse, session, classifiedIntent) {
    // Check the original classified intent type
    if (!(classifiedIntent && classifiedIntent.type === 'CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo)) {
        // if (finalResponse.type !== 'ERROR') { // Reduce noise
            // console.log(`[Controller] Original classified type (${classifiedIntent?.type}) is not CONTACT_INFO_PROVIDED or contactInfo missing. Not saving lead.`);
        // }
        return; // Only proceed if original classification was complete contact info
    }

    // console.log('[Controller] Original classification CONTACT_INFO_PROVIDED detected. Attempting to save lead...'); // Debug - Removed
    try {
        // --- Get Business Data (Needed for context determination) --- 
        const businessData = await _getBusinessData(session.businessId);
        // ----------------------------------------------------------

        // Determine context using the revised function, passing businessData
        const leadProblemContext = await _determineLeadProblemContext(session, businessData);

        // Extract PII to be sent to saveLead (which handles encryption)
        const leadPii = classifiedIntent.contactInfo; 

        const leadContext = {
            businessId: session.businessId,
            name: leadPii.name, 
            phone: leadPii.phone,
            email: leadPii.email,
            // Prioritize specific session.serviceInterest 
            serviceInterest: session.serviceInterest || finalResponse.serviceContext || 'Dental Consultation',
            problemDescription: leadProblemContext, // Use the improved context
            messageHistory: session.messages // Already redacted from _logInteractionMessages
        };
        // console.log('[Lead Save Prep] Context object being sent to saveLead:', JSON.stringify(leadContext, null, 2)); // Logs raw PII before encryption - REMOVED
        
        // console.log(`[Controller] Attempting to call saveLead for session: ${session.sessionId}`); // REMOVED LOG
        await saveLead(leadContext);
        // console.log(`[Controller] Successfully returned from saveLead for session: ${session.sessionId}`); // REMOVED LOG
        console.log(`[Controller] Lead saved successfully for session: ${session.sessionId}`); // Keep success log
        
        await updateSessionData(session.sessionId, { contactInfo: leadPii });
        session.contactInfo = leadPii;

        // console.log('[Controller] Clearing partialContactInfo from session after successful lead save.'); // Debug - Removed
        await updateSessionData(session.sessionId, { partialContactInfo: null });
        session.partialContactInfo = null; 
        
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: leadContext.serviceInterest });

    } catch (error) {
         console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack); // Keep essential error log
    }
}

async function _logInteractionMessages(sessionId, userMessageContent, userMessageType, finalResponse) {
    const redactedUserMessageContent = redactPII(userMessageContent);
    const redactedBotMessageContent = redactPII(finalResponse.response); // Redact bot response too
    
     const userMessageLog = {
        role: 'user',
        content: redactedUserMessageContent,
        timestamp: Date.now(),
        type: userMessageType,
    };
    const botMessageLog = {
        role: 'assistant',
        content: redactedBotMessageContent, // Use redacted content for logging
        timestamp: Date.now(),
        type: finalResponse.type,
        problemCategory: finalResponse.problemCategory || null
    };
    // console.log('[Controller] Logging user message:', userMessageLog); // Redundant / Debug - Removed
    // console.log('[Controller] Logging bot message:', botMessageLog); // Redundant / Debug - Removed
    await addMessagesToSession(sessionId, userMessageLog, botMessageLog);
    // Also store the last bot response type in the session for context checking
    try {
        await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
        // console.log(`[Session Update] Stored lastBotResponseType: ${finalResponse.type}`); // Debug - Removed
    } catch(err) {
        console.error("[Session Update] Error storing lastBotResponseType:", err); // Keep essential error log
    }
}

async function _trackConversationCompletionIfNeeded(finalResponse, session) {
    if (finalResponse.type === 'GOODBYE' && session.contactInfo) { // Assuming a GOODBYE type exists
        try {
            await trackChatEvent(session.businessId, 'CONVERSATION_COMPLETED');
        } catch (error) {
            console.error("Error tracking conversation completion:", error); // Keep essential error log
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

const processChatMessage = async (message, sessionId, businessId) => {
    try {
        const { session, isNewSession } = await _initializeSessionAndTrackStart(sessionId, businessId);
        const businessData = await _getBusinessData(businessId);

        // Detect initial service interest (if not already set)
        await _detectAndSetInitialServiceInterest(session, businessData, message);

        // Prepare message history (use session.messages)
        const sessionMessages = session.messages || []; // Should be redacted already if fetched from DB

        // Get previous partial info
        const previousPartialInfo = session.partialContactInfo || { name: null, phone: null, email: null };
        // console.log("[Controller] Retrieved previous partial contact info from session:", previousPartialInfo); // Potential PII - Removed

        // Generate response (AI + Overrides)
        const { classifiedIntent, responsePayload: responseAfterOverride1 } = await _generateAndRefineResponse(
            message, 
            businessData, 
            sessionMessages, 
            isNewSession, 
            session,
            previousPartialInfo
        );

        // console.log("[Controller Flow] Response payload after _generateAndRefineResponse (inc. AI type overrides):", JSON.stringify(responseAfterOverride1, null, 2)); // Debug - Removed

        // --- Second Override Pass (Based on user message type) --- 
        // console.log("[Override Check 2 Prep] Original Classified Type:", classifiedIntent?.type); // Debug - Removed
        // console.log("[Override Check 2 Prep] Type before user message override:", responseAfterOverride1.type); // Debug - Removed
        const userMessageTypes = detectRequestTypes(message);
        // console.log("[Override Check 2] Applying overrides based on detected user message types:", userMessageTypes); // Debug - Removed
        const finalResponse = applyResponseOverrides(responseAfterOverride1, userMessageTypes, session, businessData); 
        // console.log(`[Controller Flow] Final response payload after user type overrides (type: ${finalResponse.type}):`, redactPII(finalResponse.response)); // Log redacted final response? - Removed for prod

        // --- Store/Update Partial Contact Info in Session ---
        // Use the contactInfo from the original classification attempt
        if (classifiedIntent?.type === 'PARTIAL_CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo) {
             const accumulatedPartialInfo = classifiedIntent.contactInfo; // This has merged previous + current extraction
             // Only update session if the accumulated info differs from what was already there
             // (or if there was no previous partial info)
             if (!session.partialContactInfo || JSON.stringify(session.partialContactInfo) !== JSON.stringify(accumulatedPartialInfo)) {
                  await updateSessionData(sessionId, { partialContactInfo: accumulatedPartialInfo }); // Storing raw PII in session - review if needed
                  session.partialContactInfo = accumulatedPartialInfo; // Update local state
                  // console.log('[Controller] Updated partialContactInfo in session:', accumulatedPartialInfo); // Potential PII - Removed
             } else {
                  // console.log('[Controller] Partial info detected, but session already has the same accumulated data.'); // Debug - Removed
             }
        } else if (classifiedIntent?.type === 'CONTACT_INFO_PROVIDED'){
             // If complete info was provided, ensure partial info is cleared later during lead saving 
             // (which already happens in _handleLeadSavingIfNeeded)
             // console.log('[Controller] Complete contact info provided.'); // Debug - Removed
        } else if (session.partialContactInfo) {
             // If we have partial info in session, but classifier didn't detect partial/complete this turn
             // console.log(`[Controller] Classifier did not detect partial/complete info this turn (type: ${classifiedIntent?.type}). Keeping existing partial info in session:`, session.partialContactInfo); // Potential PII - Removed
        }
        // --- END Store/Update Partial Contact Info --- 

        // Track problem description if needed 
        await _trackProblemDescriptionIfNeeded(session, message, finalResponse.type, classifiedIntent?.type);

        // Save Lead if contact info provided
        const originalClassificationForLeadCheck = classifiedIntent; 
        await _handleLeadSavingIfNeeded(finalResponse, session, originalClassificationForLeadCheck);

        // Track conversation end
        await _trackConversationCompletionIfNeeded(finalResponse, session);
        
        // Log messages (use detected user type)
        const userMessageType = userMessageTypes.length > 0 ? userMessageTypes.join('/') : 'UNKNOWN'; // Or use classifiedIntent?.type if preferred
        await _logInteractionMessages(sessionId, message, userMessageType, finalResponse); // This handles redaction for DB logs

        // Update session last bot response type
        if (finalResponse.type) {
            await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
            // console.log("[Session Update] Stored lastBotResponseType:", finalResponse.type); // Debug - Removed
        }

        // Return only the string response object expected by caller
        return {
             response: escapeHtml(finalResponse.response), // Return unredacted response for UI
             type: finalResponse.type,
             sessionId // Include sessionId if needed by caller (e.g. WebSocket handler)
        };
    } catch (error) {
        console.error("Error processing message:", error); // Keep essential error log
         // Return error structure expected by caller
         return {
             response: escapeHtml(RESPONSE_TEMPLATES.ERROR()),
             type: 'ERROR',
             sessionId: sessionId || 'unknown' // Include sessionId if possible
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
        console.error("Error handling chat message:", error); // Keep essential error log
        res.status(error.message === "Business not found" ? 404 : 500).json({ 
            error: error.message || "An error occurred while processing your message" 
        });
    }
};

// WebSocket message processor 
export const processWebSocketMessage = async (message, sessionId, businessId) => {
    try {
        return await processChatMessage(message, sessionId, businessId);
    } catch (error) {
        console.error("Error processing WebSocket message:", error); // Keep essential error log
        return {
            type: "error",
            response: error.message || "An error occurred while processing your message"
        };
    }
};

