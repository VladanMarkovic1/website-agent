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
import { extractContactInfo, extractExtraDetails } from "./extractContactInfo.js";
import Lead from '../../models/Lead.js'; // Add this import at the top if not present

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

    // Use the real, scraped phone number from Contact, fallback to 'Not available'
    const businessPhoneNumber = contactData?.phone || 'Not available';
    const businessEmail = contactData?.email || 'Not available';
    const businessAddress = contactData?.address || 'Not available';
    console.log(`[DEBUG] BusinessId: ${businessId} | Contact phone from DB:`, contactData?.phone); // Debug log

    const fullBusinessData = {
        ...business.toObject(),
        services: services,
        businessPhoneNumber: businessPhoneNumber,
        businessEmail: businessEmail,
        address: businessAddress,
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
        (DENTAL_KEYWORDS_FOR_TRACKING.some(keyword => message.toLowerCase().includes(keyword)) || message.split(' ').length > 3);

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
    if (!(classifiedIntent && classifiedIntent.type === 'CONTACT_INFO_PROVIDED' && classifiedIntent.contactInfo)) {
        return false; // No lead saved
    }
    try {
        // --- Get Business Data (Needed for context determination) --- 
        const businessData = await _getBusinessData(session.businessId);
        // ----------------------------------------------------------

        // Determine context using the revised function, passing businessData
        const leadProblemContext = await _determineLeadProblemContext(session, businessData);

        // Extract PII to be sent to saveLead (which handles encryption)
        const leadPii = classifiedIntent.contactInfo; 

        // Extract extra details from the last user message in the session
        const lastUserMessage = (session.messages || []).slice().reverse().find(m => m.role === 'user');
        let extraDetails = {};
        if (lastUserMessage && lastUserMessage.content) {
            extraDetails = extractExtraDetails(lastUserMessage.content);
            console.log('[DEBUG] Extracted extraDetails from last user message:', extraDetails);
        } else {
            console.log('[DEBUG] No last user message found for extraDetails extraction.');
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
            problemDescription: leadProblemContext,
            messageHistory: session.messages,
            details: otherDetails // Only include other details, not the service
        };
        console.log('[DEBUG] leadContext being sent to saveLead:', JSON.stringify(leadContext, null, 2));
        await saveLead(leadContext);
        console.log(`[Controller] Lead saved successfully for session: ${session.sessionId}`); // Keep success log
        await updateSessionData(session.sessionId, { contactInfo: leadPii });
        session.contactInfo = leadPii;
        await updateSessionData(session.sessionId, { partialContactInfo: null });
        session.partialContactInfo = null; 
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: serviceInterest });
        return true; // Lead was saved
    } catch (error) {
         console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack); // Keep essential error log
         return false;
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
        const sessionMessages = session.messages || [];

        // Get previous partial info
        const previousPartialInfo = session.partialContactInfo || { name: null, phone: null, email: null };

        // Generate response (AI + Overrides)
        const { classifiedIntent, responsePayload } = await _generateAndRefineResponse(
            message, 
            businessData, 
            sessionMessages, 
            isNewSession, 
            session,
            previousPartialInfo
        );

        // --- Second Override Pass (Based on user message type) --- 
        const userMessageTypes = detectRequestTypes(message);
        const finalResponse = applyResponseOverrides(responsePayload, userMessageTypes, session, businessData); 

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

        // --- Only use fallback: Always save lead if message contains all info (for button-based flow) ---
        const contactInfo = extractContactInfo(message);
        const extraDetails = extractExtraDetails(message);
        if (contactInfo && contactInfo.name && contactInfo.phone && (extraDetails.concern || extraDetails.timing)) {
            // Check for existing lead
            const existingLead = await Lead.findOne({
                businessId,
                $or: [{ phone: contactInfo.phone }, ...(contactInfo.email ? [{ email: contactInfo.email }] : [])]
            });

            // Ensure we have a valid concern
            const concern = extraDetails.concern || session.serviceInterest || 'Dental Consultation';
            
            // Remove service/concern from extraDetails to avoid duplication
            const { concern: _, ...otherDetails } = extraDetails;
            
            // Create lead context with proper separation of name and concern
            const leadContext = {
                businessId,
                name: contactInfo.name,
                phone: contactInfo.phone,
                email: contactInfo.email,
                serviceInterest: concern,
                problemDescription: concern,
                messageHistory: session.messages,
                details: otherDetails // Only include other details, not the service
            };

            if (existingLead) {
                // Update existing lead with new details
                existingLead.name = contactInfo.name;
                existingLead.phone = contactInfo.phone;
                existingLead.email = contactInfo.email || existingLead.email;
                existingLead.service = concern;
                existingLead.reason = `Patient's Concern: ${concern}`;
                existingLead.details = otherDetails;
                existingLead.lastContactedAt = new Date();
                existingLead.status = 'new';
                existingLead.interactions.push({
                    type: 'chatbot',
                    status: 'Re-engaged via Chatbot',
                    message: `User re-engaged via chatbot. Concern: ${concern}`,
                    service: concern
                });
                await existingLead.save();
                console.log('[DEBUG] Fallback: Updated existing lead with details:', existingLead.details);
            } else {
                // Create new lead
                console.log('[DEBUG] (Fallback) leadContext being sent to saveLead:', JSON.stringify(leadContext, null, 2));
                await saveLead(leadContext);
            }
        }

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
        console.error("Error processing message:", error);
         return {
             response: escapeHtml(RESPONSE_TEMPLATES.ERROR()),
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

