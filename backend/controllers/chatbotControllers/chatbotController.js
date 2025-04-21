import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import Contact from "../../models/Contact.js";
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
    const [business, serviceData, contactData] = await Promise.all([
        Business.findOne({ businessId }),
        Service.findOne({ businessId }),
        Contact.findOne({ businessId })
    ]);

    if (!business) {
        throw new Error("Business not found");
    }

    const services = serviceData?.services?.map(service => ({
        name: service.name,
        description: service.description || null,
        price: service.price || null
    })) || [];

    return {
        ...business.toObject(),
        services: services,
        businessPhoneNumber: contactData?.phone || null,
        businessEmail: contactData?.email || null,
        address: contactData?.address || null
    };
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

async function _generateAndRefineResponse(message, businessData, sessionMessages, isNewSession, session) {
    const initialResponse = await generateAIResponse(message, businessData, sessionMessages, isNewSession);
    const requestTypes = detectRequestTypes(message);
    let finalResponse = applyResponseOverrides(initialResponse, requestTypes, session, businessData);

    // Update session interest if override specified it
    if (finalResponse.serviceContext && finalResponse.serviceContext !== session.serviceInterest) {
        await updateSessionData(session.sessionId, { serviceInterest: finalResponse.serviceContext }); 
        session.serviceInterest = finalResponse.serviceContext; // Update local session object
    }
    return finalResponse;
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
    let leadProblemContext = session.problemDescription || null; 

    if (leadProblemContext) {
        console.log(`[Controller] Using captured session problemDescription for lead context: "${leadProblemContext}"`);
    } else {
        const userMessages = session.messages?.filter(m => m.role === 'user');
        if (userMessages && userMessages.length > 0) {
            leadProblemContext = userMessages[userMessages.length - 1].content;
            console.log(`[Controller] Using last user message for lead context (session problemDescription was empty): "${leadProblemContext}"`);
        } else if (initialUserMessage && session.isFirstMessage) { // Use original message if first and contains contact
            leadProblemContext = initialUserMessage;
            console.log(`[Controller] Using initial message for lead context (session problemDescription was empty): "${leadProblemContext}"`);
        }
    }

    if (!leadProblemContext) {
        leadProblemContext = "User provided contact details after chatbot interaction.";
        console.log("[Controller] No specific concern context found, using generic text.");
    }
    return leadProblemContext;
}

async function _handleLeadSavingIfNeeded(finalResponse, session, initialUserMessage) {
    if (!(finalResponse.type === 'CONTACT_INFO' && finalResponse.contactInfo)) {
        if (finalResponse.type !== 'ERROR') {
            console.log(`[Controller] Final response type is ${finalResponse.type}. Not saving lead.`);
        }
        return; // Only proceed if it's a CONTACT_INFO type with contactInfo
    }

    console.log('[Controller] CONTACT_INFO type detected. Attempting to save lead...');
    try {
        const leadProblemContext = _determineLeadProblemContext(session, initialUserMessage);

        const leadContext = {
            businessId: session.businessId,
            name: finalResponse.contactInfo.name,
            phone: finalResponse.contactInfo.phone,
            email: finalResponse.contactInfo.email,
            serviceInterest: finalResponse.serviceContext || session.serviceInterest || 'Dental Consultation',
            problemDescription: leadProblemContext,
            messageHistory: session.messages 
        };
        console.log('[Controller] Data being sent to saveLead:', JSON.stringify(leadContext, null, 2));
        
        await saveLead(leadContext);
        console.log('[Controller] saveLead function executed successfully for sessionId:', session.sessionId);
        
        // Update session contact info 
        await updateSessionData(session.sessionId, { contactInfo: finalResponse.contactInfo }); 
        session.contactInfo = finalResponse.contactInfo; // Update local session object
        
        await trackChatEvent(session.businessId, 'LEAD_GENERATED', { service: leadContext.serviceInterest });

    } catch (error) {
        console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack);
        // Decide if the finalResponse should be modified here to indicate save failure to the user?
        // For now, we just log the error.
    }
}

async function _logInteractionMessages(sessionId, userMessageContent, finalResponse) {
     const userMessageLog = {
        role: 'user',
        content: userMessageContent,
        timestamp: Date.now(),
        type: finalResponse.type,
        serviceContext: finalResponse.serviceContext,
        problemCategory: finalResponse.problemCategory || null 
    };
    const botMessageLog = {
        role: 'assistant',
        content: finalResponse.response,
        timestamp: Date.now(),
        type: finalResponse.type,
        serviceContext: finalResponse.serviceContext,
        problemCategory: finalResponse.problemCategory || null 
    };
    await addMessagesToSession(sessionId, userMessageLog, botMessageLog);
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

        try {
            // 2. Fetch Business Data
            const businessData = await _getBusinessData(businessId);

            // 3. Detect Initial Service Interest (if needed)
            await _detectAndSetInitialServiceInterest(session, businessData, message);

            // 4. Generate and Refine Response
            const finalResponse = await _generateAndRefineResponse(message, businessData, session.messages, isNewSession, session);

            // 5. Track Problem Description (if needed)
            await _trackProblemDescriptionIfNeeded(session, message, finalResponse.type);
            
            // 6. Handle Lead Saving (if needed)
            await _handleLeadSavingIfNeeded(finalResponse, session, message);

            // 7. Track Hourly Activity
            try {
                await trackChatEvent(businessId, 'HOURLY_ACTIVITY');
            } catch (error) {
                console.error("Error tracking hourly activity:", error);
            }

            // 8. Log Interaction Messages
            await _logInteractionMessages(sessionId, message, finalResponse);

            // 9. Track Conversation Completion (if needed)
            await _trackConversationCompletionIfNeeded(finalResponse, session);

            // 10. Return Final Response
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
                 await _logInteractionMessages(sessionId, message, errorResponse);
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

