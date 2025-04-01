import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import ExtraInfo from "../../models/ExtraInfo.js";
import Contact from "../../models/Contact.js";
import { saveLead } from "../leadControllers/leadController.js";
import dotenv from "dotenv";

// Memory-related functions
import { 
    getSessionMemory, 
    updateSessionMemory, 
    cleanupSession, 
    storeBotResponse 
} from "./memoryService.js";

// Helpers for contact info
import { extractContactInfo } from "./memoryHelpers.js";

// Service detection
import { detectService, getServiceDetails } from "./serviceDetector.js";

// AI response
import { generateAIResponse } from "./openaiService.js";

dotenv.config();

/**
 * Fetch services, FAQs, and contact details for the chatbot
 */
export const getBusinessDataForChatbot = async (businessId) => {
    try {
        console.log(`🤖 Fetching chatbot data for business: ${businessId}`);

        const business = await Business.findOne({ businessId }).lean();
        const businessName = business?.businessName || "our clinic";

        const serviceData = await Service.findOne({ businessId }).lean();
        const services = serviceData?.services || [];

        const extraInfoData = await ExtraInfo.findOne({ businessId }).lean();
        const faqs = extraInfoData?.faqs || [];

        const contactData = await Contact.findOne({ businessId }).lean();
        const contactDetails = contactData || {};

        console.log(`✅ Chatbot Data Fetched: Services: ${services.length}, FAQs: ${faqs.length}`);

        return { businessName, services, faqs, contactDetails };
    } catch (error) {
        console.error("❌ Error fetching chatbot data:", error);
        return null;
    }
};

/**
 * Handle incoming chatbot messages
 */
export const handleChatMessage = async (message, businessId) => {
    try {
        console.log(`💬 Processing chat message: "${message}" for business ${businessId}`);

        if (!businessId) {
            return "⚠️ Error: Business ID is missing.";
        }

        // 1. Fetch business data first
        const businessData = await getBusinessDataForChatbot(businessId);
        if (!businessData) {
            return "⚠️ Sorry, I couldn't fetch business details at the moment.";
        }

        console.log("📊 Business data fetched:", {
            name: businessData.businessName,
            servicesCount: businessData.services?.length,
            faqsCount: businessData.faqs?.length
        });

        // 2. Retrieve session memory for this business/user
        const memory = getSessionMemory(businessId);

        // 3. Check for contact info (partial or complete)
        const contactInfo = extractContactInfo(message);
        if (contactInfo) {
            const { name, phone, email } = contactInfo;
            const missingFields = [];
            if (!name) missingFields.push("name");
            if (!phone) missingFields.push("phone");
            if (!email) missingFields.push("email");

            if (missingFields.length === 0) {
                // We have all three: name, phone, email
                console.log("✅ Complete contact info detected:", contactInfo);

                // Get user's initial concern/problem (first message that's not a greeting or contact info)
                const userConcern = memory.messageHistory
                    .filter(msg => msg.isUser && 
                        !msg.message.toLowerCase().includes('hello') && 
                        !msg.message.toLowerCase().includes('hi') &&
                        !extractContactInfo(msg.message))
                    .map(msg => msg.message)
                    .find(msg => msg); // Get first non-empty message

                // Get the service that was detected from the user's concern
                const concernService = userConcern ? detectService(userConcern, businessData.services) : null;
                
                // Use the service detected from concern, or current service, or default
                const serviceInterest = concernService || memory.currentService || "General Inquiry";

                try {
                    // Format the context to include both concern and detected service
                    const contextReason = userConcern ? 
                        `Patient's Concern: ${userConcern}\nDetected Service: ${serviceInterest}` : 
                        "General inquiry about dental services";

                    // Save the lead with proper context
                    const leadResponse = await saveLead(
                        businessId,
                        `name: ${name}, phone: ${phone}, email: ${email}`,
                        serviceInterest,
                        {
                            initialMessage: userConcern || message,
                            reason: contextReason
                        }
                    );
                    cleanupSession(businessId);

                    // We store the leadResponse in chat memory/log as well
                    storeBotResponse(businessId, leadResponse, serviceInterest);

                    return leadResponse;

                } catch (error) {
                    console.error("❌ Error saving lead:", error);
                    return "⚠️ Sorry, there was an error processing your request. Please try again.";
                }
            } else {
                // Partial contact info
                console.log("ℹ️ Partial contact info detected:", contactInfo);
                const response = `It looks like I still need your ${missingFields.join(" and ")}. Could you please share that?`;

                storeBotResponse(businessId, response, memory.currentService);
                return response;
            }
        }

        // 4. Check for emergency keywords
        const isEmergency = message.toLowerCase().includes('emergency') || 
                          message.toLowerCase().includes('pain') ||
                          message.toLowerCase().includes('urgent');

        // 5. Check if user has shown interest through specific keywords or questions
        const hasShownInterest = message.toLowerCase().includes('appointment') ||
                                message.toLowerCase().includes('schedule') ||
                                message.toLowerCase().includes('book') ||
                                message.toLowerCase().includes('cost') ||
                                message.toLowerCase().includes('price') ||
                                message.toLowerCase().includes('available') ||
                                (memory.messageHistory?.length > 2 && message.length > 20);

        // 6. Attempt to detect a new service
        let detectedServiceName = detectService(message, businessData.services);
        let relevantService = null;

        if (detectedServiceName) {
            // If a new service was found, update memory
            relevantService = getServiceDetails(detectedServiceName, businessData.services);
            memory.currentService = relevantService?.name || null;
        } else if (memory.currentService) {
            // If no new service but we have one stored in memory, reuse it
            relevantService = getServiceDetails(memory.currentService, businessData.services);
        }

        // 7. Generate response
        let finalResponse = "";

        if (relevantService) {
            console.log("✅ Found relevant service:", relevantService);

            let response = `Regarding ${relevantService.name}: `;
            let appended = false;

            if (relevantService.price) {
                response += `The price is ${relevantService.price}. `;
                appended = true;
            }
            if (relevantService.description) {
                response += relevantService.description;
                appended = true;
            }
            if (relevantService.additionalInfo) {
                response += ` ${relevantService.additionalInfo}`;
                appended = true;
            }

            // If no DB details found, generate a short GPT fallback
            if (!appended) {
                console.log("ℹ️ No DB details found for this service, using GPT fallback for generic info.");
                const gptFallbackPrompt = `
                  The user is interested in ${relevantService.name}.
                  We have no specific info in our database.
                  Provide a short, friendly sales pitch:
                  1. Briefly explain the service in general terms.
                  2. Encourage them to provide their contact info.
                `;
                const gptFallbackResponse = await generateAIResponse(gptFallbackPrompt, businessData);
                response += gptFallbackResponse;
            }

            finalResponse = response;
            updateSessionMemory(businessId, message, relevantService.name);
            storeBotResponse(businessId, finalResponse, relevantService.name);

        } else {
            // No service found, fallback to GPT
            console.log("ℹ️ No specific service data found, using GPT fallback");
            const gptResponse = await generateAIResponse(message, businessData, memory.messageHistory || []);
            finalResponse = gptResponse;
            updateSessionMemory(businessId, message, null);
            storeBotResponse(businessId, finalResponse, null);
        }

        return finalResponse;

    } catch (error) {
        console.error("❌ Error handling chat message:", error);
        return "⚠️ Sorry, there was an error processing your request. Please try again.";
    }
};

