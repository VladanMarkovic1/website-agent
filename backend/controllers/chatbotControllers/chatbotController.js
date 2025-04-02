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
        let finalResponse = "";

        // Check if asking about services in general
        const isServicesInquiry = message.toLowerCase().includes('what services') || 
                                 message.toLowerCase().includes('which services') ||
                                 message.toLowerCase().includes('services you offer') ||
                                 message.toLowerCase().includes('services do you offer') ||
                                 message.toLowerCase().includes('services available') ||
                                 message.toLowerCase().includes('available services');

        if (isServicesInquiry) {
            console.log("📋 Services inquiry detected");
            finalResponse = await generateAIResponse(message, businessData, memory.messageHistory || []);
            updateSessionMemory(businessId, message, null);
            storeBotResponse(businessId, finalResponse, null);
            return finalResponse;
        }

        // Check for service interest or specific service inquiry first
        const detectedServiceName = detectService(message, businessData.services);
        let relevantService = null;

        if (detectedServiceName) {
            // If a new service was found, update memory
            relevantService = getServiceDetails(detectedServiceName, businessData.services);
            memory.currentService = relevantService?.name || null;
            memory.hasShownServiceInfo = false; // Reset when new service is detected
            
            // Generate and return service information
            finalResponse = await generateAIResponse(message, businessData, memory.messageHistory || []);
            updateSessionMemory(businessId, message, relevantService?.name);
            storeBotResponse(businessId, finalResponse, relevantService?.name);
            return finalResponse;
        }

        // Now check for contact info (only if not asking about services)
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

                try {
                    // Format the contact info properly for lead saving
                    const formattedContactInfo = {
                        name: name.trim(),
                        phone: phone.trim(),
                        email: email.trim()
                    };

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

                    // Format the context to include both concern and detected service
                    const context = {
                        initialMessage: userConcern || message,
                        reason: userConcern ? 
                            `Patient's Concern: ${userConcern}\nDetected Service: ${serviceInterest}` : 
                            "General inquiry about dental services"
                    };

                    // Save the lead with proper formatting
                    const leadResponse = await saveLead(
                        businessId,
                        formattedContactInfo,  // Pass as object instead of string
                        serviceInterest,
                        context
                    );

                    cleanupSession(businessId);
                    storeBotResponse(businessId, leadResponse, serviceInterest);
                    return leadResponse;

                } catch (error) {
                    console.error("❌ Error saving lead:", error);
                    return "⚠️ Sorry, there was an error processing your request. Please try again.";
                }
            } else {
                // Partial contact info
                console.log("ℹ️ Partial contact info detected:", contactInfo);
                finalResponse = `It looks like I still need your ${missingFields.join(" and ")}. Could you please share that?`;

                storeBotResponse(businessId, finalResponse, memory.currentService);
                return finalResponse;
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

        // If we have a stored service from before, use it
        if (!relevantService && memory.currentService) {
            relevantService = getServiceDetails(memory.currentService, businessData.services);
        }

        // Generate response for other cases
        finalResponse = await generateAIResponse(message, businessData, memory.messageHistory || []);
        updateSessionMemory(businessId, message, relevantService?.name);
        storeBotResponse(businessId, finalResponse, relevantService?.name);
        return finalResponse;

    } catch (error) {
        console.error("❌ Error in handleChatMessage:", error);
        return "⚠️ Sorry, there was an error processing your message. Please try again.";
    }
};

