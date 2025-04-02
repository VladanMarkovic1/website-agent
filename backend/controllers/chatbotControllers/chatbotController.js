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

        return { 
            businessName, 
            services, 
            faqs, 
            contactDetails,
            phone: contactDetails.phone || contactDetails.emergencyPhone || business?.phone || "our office"
        };
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
            return "I apologize, but I'm having trouble connecting to our system. Please try again in a moment.";
        }

        // 2. Retrieve session memory for this business/user
        const memory = getSessionMemory(businessId);
        
        // 3. Generate AI response first - this will handle service inquiries and other patterns
        const aiResponse = await generateAIResponse(message, businessData, memory.messageHistory || []);
        
        // 4. Handle contact information and save lead if present
        if (aiResponse.type === 'CONTACT_INFO') {
            const context = {
                initialMessage: message,
                messageHistory: memory.messageHistory,
                reason: aiResponse.specificTreatment ? 
                    `Interest in: ${aiResponse.serviceInterest} (specifically ${aiResponse.specificTreatment})` :
                    `Interest in: ${aiResponse.serviceInterest}`
            };

            // Save the lead but don't use its response
            await saveLead(
                businessId,
                aiResponse.contactInfo,
                aiResponse.serviceInterest,
                context
            );
            
            // Update memory with the detected service and specific treatment
            updateSessionMemory(businessId, message, aiResponse.serviceInterest, aiResponse.specificTreatment);
            storeBotResponse(businessId, aiResponse.response, aiResponse.serviceInterest);
            
            // Return our custom response from openaiService
            return aiResponse.response;
        }
        
        // 5. Update memory and store response for other types
        updateSessionMemory(
            businessId, 
            message, 
            aiResponse.detectedService, 
            aiResponse.specificTreatment
        );
        storeBotResponse(businessId, aiResponse.response, aiResponse.detectedService);
        
        // 6. Return the response
        return aiResponse.response;

    } catch (error) {
        console.error("❌ Error in handleChatMessage:", error);
        return "I apologize, but I'm having trouble processing your message. Please try again.";
    }
};

