import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import { saveLead } from "../leadControllers/leadController.js";
import dotenv from "dotenv";
import { generateAIResponse } from "./openaiService.js";
import ChatAnalytics from "../../models/ChatAnalytics.js";
import { trackChatEvent } from "../analyticsControllers/analyticsService.js";
import Contact from "../../models/Contact.js";

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
            const [business, serviceData, contactData] = await Promise.all([
                Business.findOne({ businessId }),
                Service.findOne({ businessId }),
                Contact.findOne({ businessId })
            ]);

            if (!business) {
                throw new Error("Business not found");
            }

            // Prepare business data with services and contact info
            const businessData = {
                ...business.toObject(),
                services: serviceData?.services || [],
                phone: contactData?.phone || null,
                email: contactData?.email || null,
                address: contactData?.address || null
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
            
            const rescheduleKeywords = ['reschedule', 'change appointment', 'move appointment',
                                      'different time', 'another time', 'change my appointment',
                                      'switch appointment', 'postpone'];

            const cancelKeywords = ['cancel', 'cancelation', 'cancellation', 'delete appointment',
                                  'remove appointment', 'drop appointment'];
            
            const urgentKeywords = ['urgent', 'emergency', 'severe', 'extreme', 'asap',
                                  'right away', 'immediate', 'today', 'as soon as possible',
                                  'terrible pain', 'severe pain', 'unbearable', 'emergency slot'];
            
            const adviceKeywords = ['tips', 'advice', 'recommend', 'suggestion', 'guide',
                                  'how to', 'what should', 'best way', 'help with',
                                  'tell me about', 'information about', 'learn about'];

            const specificHealthQuestions = [
                { keywords: ['food', 'eat', 'diet', 'drink', 'avoid', 'prevent', 'cavities'], 
                  topic: 'dietary recommendations' },
                { keywords: ['brush', 'brushing', 'floss', 'flossing', 'clean', 'cleaning'], 
                  topic: 'oral hygiene practices' },
                { keywords: ['whitening', 'white', 'stain', 'yellow', 'bright', 'color'], 
                  topic: 'teeth whitening' },
                { keywords: ['sensitive', 'sensitivity', 'cold', 'hot', 'sweet'], 
                  topic: 'tooth sensitivity' },
                { keywords: ['bad breath', 'breath', 'halitosis', 'smell'], 
                  topic: 'breath freshness' }
            ];
            
            // Check if message is about booking/scheduling/canceling/urgent/advice
            const isBookingRequest = bookingKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            const isRescheduleRequest = rescheduleKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            const isCancelRequest = cancelKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            const isUrgentRequest = urgentKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            ) || (message.toLowerCase().includes('pain') && 
                  (message.toLowerCase().includes('bad') || 
                   message.toLowerCase().includes('severe') || 
                   message.toLowerCase().includes('lot of')));
            const isAdviceRequest = adviceKeywords.some(keyword =>
                message.toLowerCase().includes(keyword)
            );

            // Check for specific dental health questions
            const matchedQuestion = specificHealthQuestions.find(q => 
                q.keywords.some(keyword => message.toLowerCase().includes(keyword))
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

            // Override AI response for appointment-related requests if contact info not yet provided
            if ((isBookingRequest || isRescheduleRequest || isCancelRequest || isUrgentRequest || isAdviceRequest || matchedQuestion) && !session.contactInfo) {
                if (matchedQuestion || isAdviceRequest) {
                    const topic = matchedQuestion ? matchedQuestion.topic : 'dental health';
                    aiResponse.response = `As a dental receptionist, I cannot provide specific advice about ${topic}, as this requires a professional evaluation from our dental team.\n\nHowever, I'd be happy to connect you with our specialist who can provide personalized recommendations. Could you please share your name, phone number, and email address? Once you do, I'll make sure our dental team reaches out to schedule a consultation where they can address all your questions about ${topic}.`;
                    aiResponse.type = 'SPECIFIC_ADVICE_REQUEST';
                    session.problemDescription = message; // Store the specific question
                } else if (isUrgentRequest) {
                    // Get emergency contact from contact data
                    const businessPhone = contactData?.phone;
                    
                    const emergencyMessage = businessPhone
                        ? `\n\nIf you're experiencing severe pain, you can also reach our emergency line directly at ${businessPhone}.`
                        : `\n\nIf you're experiencing severe pain, please call our office immediately.`;

                    aiResponse.response = `I understand you're experiencing urgent dental needs. Our team prioritizes emergency cases and will contact you as soon as possible. To help you immediately, please provide your name, phone number, and email address. Once you share these details, our emergency team will reach out to you right away to provide immediate assistance.${emergencyMessage}`;
                    aiResponse.type = 'URGENT_REQUEST';
                } else if (isRescheduleRequest) {
                    aiResponse.response = "I understand you'd like to reschedule your appointment. To help you with this, I'll need your name, phone number, and email address. This way, our scheduling team can locate your existing appointment and help find a new time that works better for you. Could you please provide these details?";
                    aiResponse.type = 'RESCHEDULE_REQUEST';
                } else if (isCancelRequest) {
                    aiResponse.response = "I understand you'd like to cancel your appointment. To help you with this, I'll need your name, phone number, and email address so our team can locate your appointment in the system. Could you please share these details with me?";
                    aiResponse.type = 'CANCEL_REQUEST';
                } else {
                    aiResponse.response = "I'll be happy to help you schedule an appointment! To connect you with our scheduling specialist, I just need your name, phone number, and email address. Once you provide these details, they will reach out to find the perfect time slot for you. Could you please share those details with me?";
                    aiResponse.type = 'BOOKING_REQUEST';
                }
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
                        reason: isUrgentRequest
                            ? `⚠️ URGENT CARE NEEDED ⚠️\nEmergency Request: ${session.problemDescription || message}`
                            : isRescheduleRequest
                                ? `Reschedule Request: ${session.serviceInterest || 'Existing Appointment'}\nPatient's Message: ${session.problemDescription || message}`
                                : isCancelRequest
                                    ? `Cancellation Request: ${session.serviceInterest || 'Existing Appointment'}\nPatient's Message: ${session.problemDescription || message}`
                                    : isBookingRequest 
                                        ? `New Appointment Request: ${session.serviceInterest || 'General Appointment'}\nPatient's Message: ${session.problemDescription || message}`
                                        : matchedQuestion
                                            ? `Dental Consultation Request: Patient has questions about ${matchedQuestion.topic}\nSpecific Question: ${session.problemDescription || message}`
                                        : isAdviceRequest
                                            ? `Dental Advice Request: Patient is seeking information about: ${session.problemDescription || message}`
                                        : serviceContext 
                                            ? `Service Requested: ${serviceContext}\nPatient's Description: ${session.problemDescription || message}`
                                            : `Patient's Concern: ${session.problemDescription || message}`,
                        conversationHistory: session.messages
                            .slice(-4)
                            .map(msg => `${msg.role}: ${msg.content}`)
                            .join('\n'),
                        requestType: isUrgentRequest ? 'URGENT' 
                                   : isRescheduleRequest ? 'RESCHEDULE' 
                                   : isCancelRequest ? 'CANCEL' 
                                   : isBookingRequest ? 'NEW_BOOKING'
                                   : matchedQuestion ? 'SPECIFIC_DENTAL_ADVICE'
                                   : isAdviceRequest ? 'DENTAL_ADVICE'
                                   : 'GENERAL',
                        priority: isUrgentRequest ? 'HIGH' : 'NORMAL',
                        topic: matchedQuestion ? matchedQuestion.topic : null
                    };

                    // Save the lead with enhanced context
                    await saveLead(
                        businessId,
                        contactInfo,
                        isUrgentRequest ? 'Emergency Dental Care' 
                        : matchedQuestion ? `Dental Consultation - ${matchedQuestion.topic}`
                        : isAdviceRequest ? 'Dental Health Consultation'
                        : (serviceContext || 'Dental Consultation'),
                        detailedContext
                    );

                    // Track new lead with additional context for urgent cases
                    await trackChatEvent(businessId, 'NEW_LEAD', { 
                        service: isUrgentRequest ? 'Emergency Dental Care' : serviceContext,
                        priority: isUrgentRequest ? 'HIGH' : 'NORMAL'
                    });
                    
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

