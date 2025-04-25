import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import Contact from "../../models/Contact.js";
import ExtraInfo from "../../models/ExtraInfo.js";
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
    const [business, serviceData, contactData, extraInfoData] = await Promise.all([
        Business.findOne({ businessId }),
        Service.findOne({ businessId }),
        Contact.findOne({ businessId }),
        ExtraInfo.findOne({ businessId })
    ]);

    if (!business) {
        throw new Error("Business not found");
    }

    const services = serviceData?.services?.map(service => ({
        name: service.name,
        description: service.description || null,
        price: service.price || null
    })) || [];

    const fullBusinessData = {
        ...business.toObject(),
        services: services,
        businessPhoneNumber: contactData?.phone || null,
        businessEmail: contactData?.email || null,
        address: contactData?.address || null,
        operatingHours: extraInfoData?.operatingHours || null
    };

    console.log("[Business Data Check] Fetched business data:", JSON.stringify(fullBusinessData, null, 2)); // Log fetched data
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
            console.error("Error tracking new conversation:", error);
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
        console.log('[Controller] Detected service interest:', mentionedService.name);
        session.serviceInterest = mentionedService.name; // Update local session object too
    }
}

async function _generateAndRefineResponse(message, businessData, sessionMessages, isNewSession, session, previousPartialInfo) {
    console.log(`[AI Call Prep] Calling generateAIResponse. isNewSession=${isNewSession}. Message: "${message}". History length: ${sessionMessages?.length || 0}`);
    if (sessionMessages && sessionMessages.length > 0) {
        console.log(`[AI Call Prep] Last ${Math.min(3, sessionMessages.length)} messages:`, JSON.stringify(sessionMessages.slice(-3), null, 2));
    }
    
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
    
    console.log(`[AI Response Log] Original Classified Intent:`, JSON.stringify(classifiedIntent, null, 2)); 
    console.log(`[AI Response Log] Initial Response Payload from generateAIResponse:`, JSON.stringify(initialResponsePayload, null, 2)); 

    // --- First Override Pass (Based on the response payload type from generateAIResponse) ---
    console.log("[Override Check 1] Applying overrides based on initial response payload type.");
    let responseAfterOverride1 = applyResponseOverrides(initialResponsePayload, [], session, businessData);
    console.log("[Override Check 1] Response after first override pass:", JSON.stringify(responseAfterOverride1, null, 2));

    // Update session interest if override specified it
    if (responseAfterOverride1.serviceContext && responseAfterOverride1.serviceContext !== session.serviceInterest) {
        console.log(`[Override Check 1] Updating session service interest from ${session.serviceInterest} to ${responseAfterOverride1.serviceContext}`);
        await updateSessionData(session.sessionId, { serviceInterest: responseAfterOverride1.serviceContext });
        session.serviceInterest = responseAfterOverride1.serviceContext; // Update local session object
    }
    
    // Return both the potentially overridden payload and the original classified intent
    return { classifiedIntent, responsePayload: responseAfterOverride1 }; 
}

async function _trackProblemDescriptionIfNeeded(session, message, finalResponseType) {
    // Only try to set problemDescription if it's NOT ALREADY SET
    if (!session.problemDescription) {
        // Check if the current message seems relevant (keywords, length, not simple types)
        const isPotentiallyRelevant = 
            !['CONTACT_INFO', 'CONTACT_INFO_PROVIDED', 'GREETING', 'SMALLTALK', 'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES'].includes(finalResponseType) &&
            (DENTAL_KEYWORDS_FOR_TRACKING.some(keyword => message.toLowerCase().includes(keyword)) || message.split(' ').length > 3); // Use a threshold like > 3 words

        if (isPotentiallyRelevant) {
            await updateSessionData(session.sessionId, { problemDescription: message }); 
            session.problemDescription = message; // Update local session object
            console.log(`[Session Update] Stored relevant problemDescription: "${message}"`);
        } else {
            // console.log(`[Session Update] Message "${message}" (type: ${finalResponseType}) not deemed relevant for initial problemDescription.`);
        }
    } else {
        // console.log(`[Session Update] problemDescription already set to: "${session.problemDescription}"`);
    }
}

function _determineLeadProblemContext(session) {
    // 1. Prioritize explicitly set problemDescription (captured by _trackProblemDescriptionIfNeeded)
    let leadProblemContext = session.problemDescription || null;
    console.log("[Context Check] Starting... Trying session.problemDescription first:", leadProblemContext);

    // 2. Fallback: Search backwards for first non-trivial message if description wasn't captured
    if (!leadProblemContext) {
        console.log("[Context Check] session.problemDescription not set. Searching message history backwards.");
        const messages = session.messages || [];
        const irrelevantTypes = ['CONTACT_INFO', 'GREETING', 'SMALLTALK', 'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES']; // Types to ignore
        // Find the index of the *last* message before contact info was likely provided
        let contactMsgIndex = messages.length; // Default to end
        for (let i = messages.length - 1; i >= 0; i--) {
             if (messages[i].role === 'user' && messages[i].type === 'CONTACT_INFO') { contactMsgIndex = i; break; }
             if (i > 0 && messages[i].role === 'user' && messages[i-1].role === 'assistant' && messages[i-1].type === 'CONTACT_REQUEST') { contactMsgIndex = i; break; }
        }
        
        // Search backwards from before the contact info message
        for (let i = contactMsgIndex - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                // Check if message content is non-trivial (e.g., more than one word?)
                // and type is not irrelevant
                if (messages[i].content && messages[i].content.includes(' ') && !irrelevantTypes.includes(messages[i].type)) { 
                    leadProblemContext = messages[i].content;
                    console.log(`[Context Check] Found relevant preceding user message via history search: "${leadProblemContext}"`);
                    break; // Found the most recent relevant context
                }
            }
        }
    }

    // 3. Final fallback: Generic message
    if (!leadProblemContext) {
        leadProblemContext = "User provided contact details after chatbot interaction.";
        console.log("[Context Check] No specific concern context found, using generic text.");
    }
    
    console.log("[Context Check] Final determined context:", leadProblemContext);
    return leadProblemContext;
}

async function _handleLeadSavingIfNeeded(finalResponse, session, classifiedIntent) {
    // Check the original classified intent type
    if (!(classifiedIntent && classifiedIntent.type === 'CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo)) {
        if (finalResponse.type !== 'ERROR') {
            console.log(`[Controller] Original classified type (${classifiedIntent?.type}) is not CONTACT_INFO_PROVIDED or contactInfo missing. Not saving lead.`);
        }
        return; // Only proceed if original classification was complete contact info
    }

    console.log('[Controller] Original classification CONTACT_INFO_PROVIDED detected. Attempting to save lead...');
    try {
        // Determine context using the revised function
        const leadProblemContext = _determineLeadProblemContext(session);

        const leadContext = {
            businessId: session.businessId,
            name: classifiedIntent.contactInfo.name, 
            phone: classifiedIntent.contactInfo.phone,
            email: classifiedIntent.contactInfo.email,
            // Prioritize specific session.serviceInterest 
            serviceInterest: session.serviceInterest || finalResponse.serviceContext || 'Dental Consultation',
            problemDescription: leadProblemContext,
            messageHistory: session.messages
        };
        console.log('[Lead Save Prep] Context object being sent to saveLead:', JSON.stringify(leadContext, null, 2));
        
        await saveLead(leadContext);
        console.log('[Controller] saveLead function executed successfully for sessionId:', session.sessionId);
        
        await updateSessionData(session.sessionId, { contactInfo: classifiedIntent.contactInfo }); 
        session.contactInfo = classifiedIntent.contactInfo; 

        console.log('[Controller] Clearing partialContactInfo from session after successful lead save.');
        await updateSessionData(session.sessionId, { partialContactInfo: null });
        session.partialContactInfo = null; 
        
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: leadContext.serviceInterest });

    } catch (error) {
         console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack);
    }
}

async function _logInteractionMessages(sessionId, userMessageContent, userMessageType, finalResponse) {
    const redactedUserMessageContent = redactPII(userMessageContent);
    const redactedBotMessageContent = redactPII(finalResponse.response);
    
     const userMessageLog = {
        role: 'user',
        content: redactedUserMessageContent,
        timestamp: Date.now(),
        type: userMessageType,
    };
    const botMessageLog = {
        role: 'assistant',
        content: redactedBotMessageContent,
        timestamp: Date.now(),
        type: finalResponse.type,
        problemCategory: finalResponse.problemCategory || null
    };
    console.log('[Controller] Logging user message:', userMessageLog);
    console.log('[Controller] Logging bot message:', botMessageLog);
    await addMessagesToSession(sessionId, userMessageLog, botMessageLog);
    // Also store the last bot response type in the session for context checking
    try {
        await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
        console.log(`[Session Update] Stored lastBotResponseType: ${finalResponse.type}`);
    } catch(err) {
        console.error("[Session Update] Error storing lastBotResponseType:", err);
    }
}

async function _trackConversationCompletionIfNeeded(finalResponse, session) {
    if (finalResponse.type === 'GOODBYE' && session.contactInfo) { // Assuming a GOODBYE type exists
        try {
            await trackChatEvent(session.businessId, 'CONVERSATION_COMPLETED');
        } catch (error) {
            console.error("Error tracking conversation completion:", error);
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
        const sessionMessages = session.messages || [];

        // Get previous partial info
        const previousPartialInfo = session.partialContactInfo || { name: null, phone: null, email: null };
        console.log("[Controller] Retrieved previous partial contact info from session:", previousPartialInfo);

        // Generate response (AI + Overrides)
        const { classifiedIntent, responsePayload: responseAfterOverride1 } = await _generateAndRefineResponse(
            message, 
            businessData, 
            sessionMessages, 
            isNewSession, 
            session,
            previousPartialInfo
        );

        console.log("[Controller Flow] Response payload after _generateAndRefineResponse (inc. AI type overrides):", JSON.stringify(responseAfterOverride1, null, 2));

        // --- Second Override Pass (Based on user message type) --- 
        console.log("[Override Check 2 Prep] Original Classified Type:", classifiedIntent?.type);
        console.log("[Override Check 2 Prep] Type before user message override:", responseAfterOverride1.type);
        const userMessageTypes = detectRequestTypes(message);
        console.log("[Override Check 2] Applying overrides based on detected user message types:", userMessageTypes);
        const finalResponse = applyResponseOverrides(responseAfterOverride1, userMessageTypes, session, businessData); 
        console.log(`[Controller Flow] Final response payload after user type overrides (type: ${finalResponse.type}):`, finalResponse.response); 

        // --- Store/Update Partial Contact Info in Session ---
        // Use the contactInfo from the original classification attempt
        if (classifiedIntent?.type === 'PARTIAL_CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo) {
             const accumulatedPartialInfo = classifiedIntent.contactInfo; // This has merged previous + current extraction
             // Only update session if the accumulated info differs from what was already there
             // (or if there was no previous partial info)
             if (!session.partialContactInfo || JSON.stringify(session.partialContactInfo) !== JSON.stringify(accumulatedPartialInfo)) {
                  await updateSessionData(sessionId, { partialContactInfo: accumulatedPartialInfo });
                  session.partialContactInfo = accumulatedPartialInfo; // Update local state
                  console.log('[Controller] Updated partialContactInfo in session:', accumulatedPartialInfo);
             } else {
                  console.log('[Controller] Partial info detected, but session already has the same accumulated data.');
             }
        } else if (classifiedIntent?.type === 'CONTACT_INFO_PROVIDED'){
             // If complete info was provided, ensure partial info is cleared later during lead saving 
             // (which already happens in _handleLeadSavingIfNeeded)
             console.log('[Controller] Complete contact info provided.');
        } else if (session.partialContactInfo) {
             // If we have partial info in session, but classifier didn't detect partial/complete this turn
             console.log(`[Controller] Classifier did not detect partial/complete info this turn (type: ${classifiedIntent?.type}). Keeping existing partial info in session:`, session.partialContactInfo);
        }
        // --- END Store/Update Partial Contact Info --- 

        // Track problem description if needed 
        await _trackProblemDescriptionIfNeeded(session, message, finalResponse.type);

        // Save Lead if contact info provided
        const originalClassificationForLeadCheck = classifiedIntent; 
        await _handleLeadSavingIfNeeded(finalResponse, session, originalClassificationForLeadCheck);

        // Track conversation end
        await _trackConversationCompletionIfNeeded(finalResponse, session);
        
        // Log messages (use detected user type)
        const userMessageType = userMessageTypes.length > 0 ? userMessageTypes.join('/') : 'UNKNOWN'; // Or use classifiedIntent?.type if preferred
        await _logInteractionMessages(sessionId, message, userMessageType, finalResponse);

        // Update session last bot response type
        if (finalResponse.type) {
            await updateSessionData(sessionId, { lastBotResponseType: finalResponse.type });
            console.log("[Session Update] Stored lastBotResponseType:", finalResponse.type);
        }

        // Return only the string response object expected by caller
        return {
             response: escapeHtml(finalResponse.response),
             type: finalResponse.type,
             sessionId // Include sessionId if needed by caller (e.g. WebSocket handler)
        };
    } catch (error) {
        console.error("Error processing message:", error);
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
        console.error("Error handling chat message:", error);
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
        console.error("Error processing WebSocket message:", error);
        return {
            type: "error",
            response: error.message || "An error occurred while processing your message"
        };
    }
};

