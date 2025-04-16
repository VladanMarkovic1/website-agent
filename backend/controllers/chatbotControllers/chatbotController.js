import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import Contact from "../../models/Contact.js";
import { saveLead } from "../leadControllers/leadController.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";
import { generateAIResponse } from "./openaiService.js";
import { getOrCreateSession, updateSessionData, addMessagesToSession } from "./sessionService.js";
import { detectRequestTypes } from "./requestTypeDetector.js";
import { applyResponseOverrides } from "./overrideService.js";
import { DENTAL_KEYWORDS_FOR_TRACKING } from "./chatbotConstants.js"; // Only needed for problem description tracking

// Removed session map, timeout, cleanup (moved to sessionService)

// Fetch business data (could be further extracted later)
async function getBusinessData(businessId) {
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

// --- Refactored Main Processing Logic --- 

const processChatMessage = async (message, sessionId, businessId) => {
    try {
        if (!message || !sessionId || !businessId) {
            throw new Error("Missing required fields: message, sessionId, or businessId");
        }

        // 1. Get Session
        const { session, isNew: isNewSession } = getOrCreateSession(sessionId, businessId);

        // 2. Track New Conversation (if applicable)
        if (session.isFirstMessage) {
            try {
                await trackChatEvent(businessId, 'NEW_CONVERSATION');
                updateSessionData(sessionId, { isFirstMessage: false });
            } catch (error) {
                console.error("Error tracking new conversation:", error);
            }
        }

        try {
            // 3. Get Business Data
            const businessData = await getBusinessData(businessId);

            // 4. Detect Simple Service Mention (for session context)
            const messageLower = message.toLowerCase();
            const mentionedService = businessData.services.find(service => {
                if (!service || !service.name) return false;
                const serviceName = service.name.toLowerCase();
                return messageLower.includes(serviceName) || 
                       serviceName.split(' ').every(word => 
                           messageLower.includes(word.toLowerCase())
                       );
            });
            if (mentionedService && !session.serviceInterest) { // Only set if not already set
                updateSessionData(sessionId, { serviceInterest: mentionedService.name });
                console.log('[Controller] Detected service interest:', mentionedService.name);
            }

            // 5. Generate Initial AI Response
            const initialResponse = await generateAIResponse(
                message, 
                businessData,
                session.messages,
                isNewSession
            );

            // 6. Detect Request Types for Potential Override
            const requestTypes = detectRequestTypes(message);

            // 7. Apply Overrides (if needed)
            let finalResponse = applyResponseOverrides(initialResponse, requestTypes, session, businessData);

             // Update session interest if override specified it
             if (finalResponse.serviceContext && finalResponse.serviceContext !== session.serviceInterest) {
                  updateSessionData(sessionId, { serviceInterest: finalResponse.serviceContext });
             }

            // 8. Track Problem Description
            if (!session.problemDescription && 
                !['CONTACT_INFO_PROVIDED', 'GREETING'].includes(finalResponse.type) &&
                (DENTAL_KEYWORDS_FOR_TRACKING.some(keyword => messageLower.includes(keyword)) || message.split(' ').length > 5)
               ) {
                 updateSessionData(sessionId, { problemDescription: message });
            }

            // 9. Handle Lead Saving
            if (finalResponse.type === 'CONTACT_INFO' && finalResponse.contactInfo) {
                console.log('[Controller] CONTACT_INFO type detected. Attempting to save lead...');
                try {
                    // --- Start: Determine the best context for the lead --- 
                    let leadProblemContext = session.problemDescription || null; // Prioritize captured problem

                    if (leadProblemContext) {
                        console.log(`[Controller] Using captured session problemDescription for lead context: "${leadProblemContext}"`);
                    } else {
                        // Fallback: If no problem was captured, try the last user message
                        const userMessages = session.messages?.filter(m => m.role === 'user');
                        if (userMessages && userMessages.length > 0) {
                            leadProblemContext = userMessages[userMessages.length - 1].content;
                            console.log(`[Controller] Using last user message for lead context (session problemDescription was empty): "${leadProblemContext}"`);
                        } else if (message && session.isFirstMessage) {
                            // Edge case: First message contained contact info
                            leadProblemContext = message;
                            console.log(`[Controller] Using initial message for lead context (session problemDescription was empty): "${leadProblemContext}"`);
                        }
                    }
                    
                    // Final fallback if no context could be determined
                    if (!leadProblemContext) {
                        leadProblemContext = "User provided contact details after chatbot interaction.";
                        console.log("[Controller] No specific concern context found, using generic text.");
                    }
                    // --- End: Determine context --- 

                    const leadContext = {
                        businessId: session.businessId,
                        name: finalResponse.contactInfo.name,
                        phone: finalResponse.contactInfo.phone,
                        email: finalResponse.contactInfo.email,
                        serviceInterest: finalResponse.serviceContext || session.serviceInterest || 'Dental Consultation',
                        problemDescription: leadProblemContext, // Use the determined context
                        messageHistory: session.messages 
                    };
                    console.log('[Controller] Data being sent to saveLead:', JSON.stringify(leadContext, null, 2));
                    
                    await saveLead(leadContext);
                    
                    console.log('[Controller] saveLead function executed successfully for sessionId:', sessionId);
                    // Update session only AFTER successful save
                    updateSessionData(sessionId, { contactInfo: finalResponse.contactInfo }); 
                    await trackChatEvent(businessId, 'LEAD_GENERATED', { service: leadContext.serviceInterest });

                } catch (error) {
                    console.error('[Controller] Error occurred during saveLead call:', error.message, error.stack);
                    // Potentially modify finalResponse to indicate save failure?
                }
            } else if (finalResponse.type !== 'ERROR') { 
                 console.log(`[Controller] Final response type is ${finalResponse.type}. Not saving lead.`);
            }

            // 10. Track Hourly Activity
            try {
                await trackChatEvent(businessId, 'HOURLY_ACTIVITY');
            } catch (error) {
                console.error("Error tracking hourly activity:", error);
            }

            // 11. Update Message History in Session
            const userMessageLog = {
                role: 'user',
                content: message,
                timestamp: Date.now(),
                type: finalResponse.type, // Log final type
                serviceContext: finalResponse.serviceContext, // Log final context
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
            addMessagesToSession(sessionId, userMessageLog, botMessageLog);

            // 12. Track Conversation Completion
            if (finalResponse.type === 'GOODBYE' && session.contactInfo) { // Assuming a GOODBYE type exists
                try {
                    await trackChatEvent(businessId, 'CONVERSATION_COMPLETED');
                } catch (error) {
                    console.error("Error tracking conversation completion:", error);
                }
            }

            // 13. Return Final Response
            return {
                response: finalResponse.response,
                type: finalResponse.type,
                sessionId
            };

        } catch (error) {
            // Error during business data fetch or response generation/override
            console.error("Error processing message:", error);
            // Use a generic error response from constants
             const errorResponse = {
                type: "ERROR",
                response: RESPONSE_TEMPLATES.api_error_fallback || "An internal error occurred."
            };
             // Still try to log the error message to history
             const userMessageLog = { role: 'user', content: message, timestamp: Date.now() };
             const botMessageLog = { role: 'assistant', content: errorResponse.response, timestamp: Date.now(), type: 'ERROR' };
             addMessagesToSession(sessionId, userMessageLog, botMessageLog);
            return { ...errorResponse, sessionId }; 
        }
    } catch (error) {
        // Catch errors from session creation or initial validation
        console.error("Critical error in message processing entry:", error);
        return {
            response: "I apologize, but I'm experiencing critical technical difficulties.",
            type: "ERROR",
            sessionId: sessionId || 'error' // Use provided sessionId if available
        };
    }
};

// HTTP endpoint handler (remains the same)
export const handleChatMessage = async (req, res) => {
    try {
        const { message, sessionId, businessId } = req.body;
        const response = await processChatMessage(message, sessionId, businessId);
        res.json(response);
    } catch (error) {
        console.error("Error handling chat message:", error);
        res.status(error.message === "Business not found" ? 404 : 500).json({ 
            error: error.message || "An error occurred while processing your message" 
        });
    }
};

// WebSocket message processor (remains the same)
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

