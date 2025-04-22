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
    
    // *** Assume generateAIResponse now returns { classifiedIntent, responsePayload } ***
    const aiResult = await generateAIResponse(message, businessData, sessionMessages, isNewSession, previousPartialInfo);
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
    if (!session.problemDescription && 
        !['CONTACT_INFO_PROVIDED', 'GREETING'].includes(finalResponseType) &&
        (DENTAL_KEYWORDS_FOR_TRACKING.some(keyword => message.toLowerCase().includes(keyword)) || message.split(' ').length > 5)
       ) {
         await updateSessionData(session.sessionId, { problemDescription: message }); 
         session.problemDescription = message; // Update local session object
    }
}

function _determineLeadProblemContext(session, initialUserMessage) {
    const messages = session.messages || [];
    let leadProblemContext = session.problemDescription || null; // Check explicitly set context first
    let contactMsgIndex = -1;

    console.log("[Context Check] Starting... Trying session.problemDescription first:", leadProblemContext);

    // If specific context wasn't set (e.g., via availability confirmation), search history
    if (!leadProblemContext) {
        console.log("[Context Check] session.problemDescription not set. Searching message history.");
        // 1. Find the index of the *last* user message containing contact info (or where bot asked for it)
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user' && messages[i].type === 'CONTACT_INFO') {
                contactMsgIndex = i;
                console.log(`[Context Check] Found user CONTACT_INFO message at index ${i}.`);
                break;
            } 
            // Also check if the *bot* asked for contact info just before the last user message
            if (i === messages.length - 2 && messages[i].role === 'assistant' && (messages[i].type === 'CONTACT_REQUEST' || messages[i].content.includes('provide your full name'))) {
                 contactMsgIndex = i + 1; // Assume the user msg right after is the contact info
                 console.log(`[Context Check] Found bot CONTACT_REQUEST message at index ${i}. Assuming contact info follows.`);
                 break;
            }
        }
        // Default to searching from the end if no clear contact info point found
        if (contactMsgIndex === -1) {
             contactMsgIndex = messages.length;
             console.log("[Context Check] No clear contact info message found, will search backwards from end.");
        }

        // 2. Search backwards from *before* contact info for the most recent *meaningful* user message
        console.log(`[Context Check] Searching backwards from index ${contactMsgIndex - 1} for relevant user context.`);
        const irrelevantTypes = ['CONTACT_INFO', 'GREETING', 'SMALLTALK', 'AFFIRMATION', 'NEGATION', 'CONFIRMATION_YES']; // Types to ignore
        for (let i = contactMsgIndex - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                 console.log(`[Context Check] Checking user message at index ${i}: Type=${messages[i].type}, Content="${messages[i].content}"`);
                if (!irrelevantTypes.includes(messages[i].type)) {
                    leadProblemContext = messages[i].content;
                    console.log(`[Context Check] Found relevant preceding user message context at index ${i}: "${leadProblemContext}"`);
                    break; // Found the most recent relevant context
                } else {
                     console.log(`[Context Check] Skipping user message at index ${i} due to irrelevant type: ${messages[i].type}`);
                }
            }
        }
         if (!leadProblemContext) {
             console.log("[Context Check] Backward search finished without finding relevant preceding user message.");
         }
    }

    // 3. Fallback to the *very first* user message if still no context
    if (!leadProblemContext) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            leadProblemContext = firstUserMessage.content;
            console.log(`[Context Check] Using first user message as fallback: "${leadProblemContext}"`);
        } else {
             console.log("[Context Check] No first user message found either.");
        }
    }

    // 4. Final fallback: Generic message
    if (!leadProblemContext) {
        leadProblemContext = "User provided contact details after chatbot interaction.";
        console.log("[Context Check] No specific concern context found, using generic text.");
    }
    
    console.log("[Context Check] Final determined context:", leadProblemContext);
    return leadProblemContext;
}

async function _handleLeadSavingIfNeeded(finalResponse, session, initialUserMessage, classifiedIntent) {
    // Check the original classified intent type
    if (!(classifiedIntent && classifiedIntent.type === 'CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo)) {
        if (finalResponse.type !== 'ERROR') {
            console.log(`[Controller] Original classified type (${classifiedIntent?.type}) is not CONTACT_INFO_PROVIDED or contactInfo missing. Not saving lead.`);
        }
        return; // Only proceed if original classification was complete contact info
    }

    console.log('[Controller] Original classification CONTACT_INFO_PROVIDED detected. Attempting to save lead...');
    try {
        const leadProblemContext = _determineLeadProblemContext(session, initialUserMessage);

        const leadContext = {
            businessId: session.businessId,
            name: classifiedIntent.contactInfo.name, // Use info from classifiedIntent
            phone: classifiedIntent.contactInfo.phone,
            email: classifiedIntent.contactInfo.email,
            serviceInterest: finalResponse.serviceContext || session.serviceInterest || 'Dental Consultation', // Can still use finalResponse for service context if refined
            problemDescription: leadProblemContext,
            messageHistory: session.messages 
        };
        
        console.log('[Lead Save Prep] Context object being sent to saveLead:', JSON.stringify(leadContext, null, 2));
        
        await saveLead(leadContext);
        console.log('[Controller] saveLead function executed successfully for sessionId:', session.sessionId);
        
        // Update session contact info (this stores the *complete* info, might be redundant but okay)
        await updateSessionData(session.sessionId, { contactInfo: classifiedIntent.contactInfo }); 
        session.contactInfo = classifiedIntent.contactInfo; // Update local session object

        // --- CLEAR Partial Info from Session --- 
        console.log('[Controller] Clearing partialContactInfo from session after successful lead save.');
        await updateSessionData(session.sessionId, { partialContactInfo: null });
        session.partialContactInfo = null; // Also clear local session object state
        // --- END CLEAR --- 
        
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: leadContext.serviceInterest });

    } catch (error) {
        console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack);
    }
}

async function _logInteractionMessages(sessionId, userMessageContent, userMessageType, finalResponse) {
     const userMessageLog = {
        role: 'user',
        content: userMessageContent,
        timestamp: Date.now(),
        type: userMessageType,
    };
    const botMessageLog = {
        role: 'assistant',
        content: finalResponse.response,
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

// --- Main Orchestrator Function --- 

const processChatMessage = async (message, sessionId, businessId) => {
    try {
        if (!message || !sessionId || !businessId) {
            throw new Error("Missing required fields: message, sessionId, or businessId");
        }

        // 1. Initialize Session & Track Start
        const { session, isNewSession } = await _initializeSessionAndTrackStart(sessionId, businessId);
        const lastBotResponseType = session.lastBotResponseType; // Get previous bot response type
        const partialContactInfo = session.partialContactInfo || { name: null, phone: null, email: null }; // Get previous partial info
        console.log('[Controller] Retrieved previous partial contact info from session:', partialContactInfo);

        try {
            // 2. Fetch Business Data
            const businessData = await _getBusinessData(businessId);

            // 3. Detect User Request Types
            const detectedTypes = detectRequestTypes(message); // Get the result
            const requestTypes = Array.isArray(detectedTypes) ? detectedTypes : []; 
            const userMessageType = requestTypes[0] || 'UNKNOWN';
            console.log(`[Controller] Detected request types for user message: ${requestTypes.join(', ')}. Primary: ${userMessageType}`);
            console.log(`[Controller] Last bot response type from session: ${lastBotResponseType}`); // Log previous type

            // --- Add logging BEFORE context refinement check ---
            console.log(`[Context Check] About to evaluate: lastBotResponseType === 'AVAILABILITY_INFO' (${lastBotResponseType === 'AVAILABILITY_INFO'}) && userMessageType === 'AFFIRMATION' (${userMessageType === 'AFFIRMATION'})`);

            // --- Context Refinement based on Affirmation after Availability Info ---
            if (lastBotResponseType === 'AVAILABILITY_INFO' && userMessageType === 'AFFIRMATION') {
                const newContext = "User confirmed interest after checking appointment availability.";
                // --- Add logging INSIDE context refinement block ---
                console.log("*** [Context Update] CORRECT BLOCK ENTERED: Setting specific problemDescription. ***", newContext);
                await updateSessionData(sessionId, { problemDescription: newContext });
                session.problemDescription = newContext; // Update local session object immediately
            }
            // --- End Context Refinement ---

            // 4. Detect Initial Service Interest (if needed)
            await _detectAndSetInitialServiceInterest(session, businessData, message);

            // Re-read partial info from the session object *just before* the AI call
            const currentPartialInfo = session.partialContactInfo || { name: null, phone: null, email: null };
            console.log(`[AI Call Prep] Using partial info for AI/Classifier call:`, currentPartialInfo);

            // 5. Generate Initial Response (passing the most recent partialContactInfo)
            //    This now returns { classifiedIntent, responsePayload }
            const { classifiedIntent, responsePayload: intermediateResponse } = await _generateAndRefineResponse(message, businessData, session.messages, isNewSession, session, currentPartialInfo);
            console.log(`[Controller Flow] Response payload after _generateAndRefineResponse (inc. AI type overrides):`, JSON.stringify(intermediateResponse, null, 2));
            
            // Store the type determined by the *original classifier* run
            const originalClassifiedType = classifiedIntent.type; 
            console.log(`[Override Check 2 Prep] Original Classified Type: ${originalClassifiedType}`);
            console.log(`[Override Check 2 Prep] Type before user message override: ${intermediateResponse.type}`);

            // 6. Apply Overrides based on detected user message types (acts on the intermediateResponse payload)
            console.log("[Override Check 2] Applying overrides based on detected user message types:", requestTypes);
            let finalResponse = applyResponseOverrides(intermediateResponse, requestTypes, session, businessData);
            console.log(`[Controller Flow] Final response payload after user type overrides (type: ${finalResponse.type}):`, finalResponse.response);

            // --- Correction Step ---
            // If the *original classifier* determined contact info was complete, 
            // ensure the subsequent overrides didn't discard that critical state for lead saving.
            // We primarily ensure the lead saving function gets called correctly later.
            // We might still want the final *response text* to be e.g., a confirmation, not necessarily the raw "CONTACT_INFO_PROVIDED" response.
            if (originalClassifiedType === 'CONTACT_INFO_PROVIDED' && finalResponse.type !== 'CONTACT_INFO_PROVIDED') {
                console.warn(`[Override Info] Original classification was CONTACT_INFO_PROVIDED, but final response type is ${finalResponse.type}. Lead saving check will use original classification.`);
                // We don't necessarily force finalResponse.type back here, 
                // as the text in finalResponse might be a better confirmation message.
                // The lead saving logic (_handleLeadSavingIfNeeded) now checks originalClassifiedType.
            }
            // --- End Correction Step ---

            // --- Refined Save Partial Info Back to Session ---
            // Save partial info IF the *original classifier* detected it.
            // Use the contactInfo from the *original classification* result.
            if (originalClassifiedType === 'PARTIAL_CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo) {
                 const partialInfoToSave = classifiedIntent.contactInfo;
                 // Only save if it's different from what's already in the session to avoid unnecessary DB writes
                 if (JSON.stringify(partialInfoToSave) !== JSON.stringify(session.partialContactInfo)) {
                     console.log('[Controller] Saving/Updating partial contact info to session (based on original classification):', partialInfoToSave);
                     await updateSessionData(sessionId, { partialContactInfo: partialInfoToSave });
                     session.partialContactInfo = partialInfoToSave; // Keep local session object in sync
                 } else {
                      console.log('[Controller] Partial info detected by classifier, but it matches existing session data. No update needed.');
                 }
            } else if (session.partialContactInfo && 
                       originalClassifiedType !== 'CONTACT_INFO_PROVIDED' && 
                       originalClassifiedType !== 'PARTIAL_CONTACT_INFO_PROVIDED') {
                // If we had partial info previously, but the classifier didn't detect partial/complete this turn, log it.
                console.log(`[Controller] Classifier did not detect partial/complete info this turn (type: ${originalClassifiedType}). Keeping existing partial info in session:`, session.partialContactInfo);
            }
            // --- End Refined Save Partial Info ---
            
            // 7. Track Problem Description (if needed)
            await _trackProblemDescriptionIfNeeded(session, message, finalResponse.type); // Use finalResponse.type for tracking relevance
            
            // 8. Handle Lead Saving (if needed - passes original classified intent)
            await _handleLeadSavingIfNeeded(finalResponse, session, message, classifiedIntent);

            // 9. Track Hourly Activity
            try {
                await trackChatEvent(businessId, 'HOURLY_ACTIVITY');
            } catch (error) {
                console.error("Error tracking hourly activity:", error);
            }

            // 10. Log Interaction Messages (stores last bot response type)
            await _logInteractionMessages(sessionId, message, userMessageType, finalResponse);

            // 11. Track Conversation Completion (if needed)
            await _trackConversationCompletionIfNeeded(finalResponse, session);

            // 12. Return Final Response
            return {
                response: finalResponse.response,
                type: finalResponse.type,
                sessionId
            };

        } catch (processingError) {
            // Handle errors during the main processing steps (after session init)
            console.error("Error processing message:", processingError);
            const errorResponse = {
                type: "ERROR",
                response: RESPONSE_TEMPLATES.api_error_fallback || "An internal error occurred."
            };
            // Attempt to log error to session
            try {
                 await _logInteractionMessages(sessionId, message, userMessageType, errorResponse);
             } catch (logError) {
                 console.error("Failed to log error message to session:", logError);
             }
            return { ...errorResponse, sessionId }; 
        }
    } catch (initializationError) {
        // Handle critical errors during session initialization or initial validation
        console.error("Critical error in message processing entry:", initializationError);
        return {
            response: "I apologize, but I'm experiencing critical technical difficulties.",
            type: "ERROR",
            sessionId: sessionId || 'error' 
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

