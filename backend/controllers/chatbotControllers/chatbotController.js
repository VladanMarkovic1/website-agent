import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import { saveLead } from "../leadControllers/leadController.js";
import dotenv from "dotenv";
import { generateAIResponse } from "./openaiService.js";
import ChatAnalytics from "../../models/ChatAnalytics.js";

// In-memory session storage
const sessions = new Map();

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const cleanupSessions = () => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);

// Process chat message and return response
const processChatMessage = async (message, sessionId, businessId) => {
    try {
        if (!message || !sessionId || !businessId) {
            throw new Error("Missing required fields: message, sessionId, or businessId");
        }

        // Get or create session
        let session = sessions.get(sessionId);
        const isNewSession = !session;
        
        if (!session) {
            session = {
                messages: [],
                lastActivity: Date.now(),
                businessId,
                contactInfo: null,
                serviceInterest: null
            };
            sessions.set(sessionId, session);
        }

        // Update session activity
        session.lastActivity = Date.now();

        try {
            // Get business data
            const [business, serviceData] = await Promise.all([
                Business.findOne({ businessId }),
                Service.findOne({ businessId })
            ]);

            if (!business) {
                throw new Error("Business not found");
            }

            // Prepare business data with services
            const businessData = {
                ...business.toObject(),
                services: serviceData?.services || []
            };

            // Generate AI response
            const aiResponse = await generateAIResponse(
                message, 
                businessData,
                session.messages,
                isNewSession
            );

            // Handle contact information and save lead
            if (aiResponse.type === 'CONTACT_INFO') {
                const { contactInfo, serviceContext } = aiResponse;
                
                try {
                    // Save the lead
                    await saveLead(
                        businessId,
                        contactInfo,
                        serviceContext || 'General Inquiry',
                        {
                            initialMessage: message,
                            reason: serviceContext 
                                ? `Chat inquiry about ${serviceContext}` 
                                : 'General chat inquiry'
                        }
                    );

                    console.log(`✅ Lead saved successfully for ${contactInfo.name}`);
                    
                    // Update session with contact info
                    session.contactInfo = contactInfo;
                    session.serviceInterest = serviceContext;
                } catch (error) {
                    console.error("Error saving lead:", error);
                }
            }

            // Update analytics for new sessions
            if (isNewSession) {
                try {
                    await ChatAnalytics.findOneAndUpdate(
                        { businessId, date: new Date().toISOString().split('T')[0] },
                        { $inc: { totalConversations: 1 } },
                        { upsert: true, new: true }
                    );
                } catch (error) {
                    console.error("Error updating analytics:", error);
                }
            }

            // Update message history
            session.messages.push({
                role: 'user',
                content: message,
                timestamp: Date.now(),
                type: aiResponse.type,
                serviceContext: aiResponse.serviceContext
            });

            session.messages.push({
                role: 'assistant',
                content: aiResponse.response,
                timestamp: Date.now(),
                type: aiResponse.type,
                serviceContext: aiResponse.serviceContext
            });

            // Keep only last 10 messages
            if (session.messages.length > 10) {
                session.messages = session.messages.slice(-10);
            }

            return {
                response: aiResponse.response,
                type: aiResponse.type,
                sessionId
            };

        } catch (error) {
            console.error("Error processing message:", error);
            return {
                response: "I apologize, but I'm having trouble accessing our service information right now. Would you like to share your name, phone number, and email so our team can reach out to you directly?",
                type: "ERROR",
                sessionId
            };
        }
    } catch (error) {
        console.error("Critical error in message processing:", error);
        return {
            response: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
            type: "ERROR",
            sessionId: sessionId || 'error'
        };
    }
};

// HTTP endpoint handler
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

