import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import { saveLead } from "../leadControllers/leadController.js";
import dotenv from "dotenv";
import { generateAIResponse } from "./openaiService.js";
import ChatAnalytics from "../../models/ChatAnalytics.js";
import { trackChatEvent } from "../analyticsControllers/analyticsService.js";

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
                serviceInterest: null,
                isFirstMessage: true,
                problemDescription: null  // Track the user's dental problem
            };
            sessions.set(sessionId, session);
        }

        // Track new conversation only on first actual message
        if (session.isFirstMessage) {
            try {
                await trackChatEvent(businessId, 'NEW_CONVERSATION');
                session.isFirstMessage = false; // Mark that first message has been sent
            } catch (error) {
                console.error("Error tracking new conversation:", error);
            }
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

            // Store problem description if it's a dental issue and not already stored
            const dentalKeywords = ['pain', 'hurt', 'ache', 'sensitive', 'broken', 'chipped', 
                                  'bleeding', 'swollen', 'cavity', 'tooth', 'teeth', 'gum',
                                  'wisdom', 'crown', 'filling', 'root canal', 'cleaning',
                                  'implant', 'denture', 'bridge', 'extraction'];

            const bookingKeywords = ['schedule', 'appointment', 'book', 'booking', 'reserve',
                                   'slot', 'time', 'available', 'availability', 'when can'];
            
            // Check if message is about booking/scheduling
            const isBookingRequest = bookingKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );

            // Enhanced problem tracking
            if (!session.problemDescription && 
                !aiResponse.type.includes('CONTACT_INFO') && 
                !aiResponse.type.includes('GREETING')) {
                // Store as problem description if it contains dental keywords or is a substantial message
                if (dentalKeywords.some(keyword => message.toLowerCase().includes(keyword)) ||
                    message.split(' ').length > 5) {
                    session.problemDescription = message;
                }
            }

            // Override AI response for booking requests if contact info not yet provided
            if (isBookingRequest && !session.contactInfo) {
                aiResponse.response = "I'll be happy to help you schedule an appointment! To connect you with our scheduling specialist, I just need your name, phone number, and email address. Once you provide these details, they will reach out to find the perfect time slot for you. Could you please share those details with me?";
                aiResponse.type = 'BOOKING_REQUEST';
                // Store the original service context if it exists
                if (aiResponse.serviceContext) {
                    session.serviceInterest = aiResponse.serviceContext;
                }
            }

            // Handle contact information and save lead
            if (aiResponse.type === 'CONTACT_INFO') {
                const { contactInfo, serviceContext } = aiResponse;
                
                try {
                    // Prepare a detailed context for the lead
                    const detailedContext = {
                        initialMessage: session.problemDescription || message,
                        reason: isBookingRequest 
                            ? `Appointment Request: ${session.serviceInterest || 'General Appointment'}\nPatient's Message: ${session.problemDescription || message}`
                            : serviceContext 
                                ? `Service Requested: ${serviceContext}\nPatient's Description: ${session.problemDescription || message}`
                                : `Patient's Concern: ${session.problemDescription || message}`,
                        conversationHistory: session.messages
                            .slice(-4)
                            .map(msg => `${msg.role}: ${msg.content}`)
                            .join('\n')
                    };

                    // Save the lead with enhanced context
                    await saveLead(
                        businessId,
                        contactInfo,
                        serviceContext || 'Dental Consultation',  // Changed from 'General Inquiry' to be more specific
                        detailedContext
                    );

                    console.log(`✅ Lead saved successfully for ${contactInfo.name} with detailed context`);
                    
                    // Track new lead with service context
                    await trackChatEvent(businessId, 'NEW_LEAD', { service: serviceContext });
                    
                    // Update session with contact info
                    session.contactInfo = contactInfo;
                    session.serviceInterest = serviceContext;
                } catch (error) {
                    console.error("Error saving lead:", error);
                }
            }

            // Track hourly activity
            try {
                await trackChatEvent(businessId, 'HOURLY_ACTIVITY');
            } catch (error) {
                console.error("Error tracking hourly activity:", error);
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

            // Track conversation completion if it's a goodbye message
            if (aiResponse.type === 'GOODBYE' && session.contactInfo) {
                try {
                    await trackChatEvent(businessId, 'CONVERSATION_COMPLETED');
                } catch (error) {
                    console.error("Error tracking conversation completion:", error);
                }
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

