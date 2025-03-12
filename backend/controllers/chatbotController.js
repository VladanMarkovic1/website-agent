import Business from "../models/Business.js";
import Service from "../models/Service.js";
import ExtraInfo from "../models/ExtraInfo.js";
import Contact from "../models/Contact.js";
import { saveLead } from "./leadController.js";

// Import our new services and utilities
import { 
    getSessionMemory, 
    updateSessionMemory, 
    cleanupSession, 
    storeBotResponse 
} from "../services/memoryService.js";  // note the .js extension

import { 
    detectService, 
    isValidService, 
    isServiceRelatedQuery 
} from "../utils/serviceDetector.js";  // note the .js extension

import { 
    generateResponse, 
    generateFallbackResponse 
} from "../utils/responseGenerator.js";  // note the .js extension

import { 
    extractContactInfo, 
    hasCompleteContactInfo 
} from "../utils/memoryHelpers.js";  // note the .js extension

import { 
    serviceInfo, 
    getAllServiceNames 
} from "../data/serviceInfo.js";  // note the .js extension
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

        if (!businessId) return "⚠️ Error: Business ID is missing.";

        // Get session memory
        const memory = getSessionMemory(businessId);
        
        // Check for contact information
        const contactInfo = extractContactInfo(message);
        if (contactInfo && hasCompleteContactInfo(contactInfo)) {
            console.log("✅ Contact info detected:", contactInfo);
            const { name, phone, email } = contactInfo;
            const serviceInterest = memory.currentService || "General Inquiry";
            
            try {
                await saveLead(businessId, `name: ${name}, phone: ${phone}, email: ${email}`, serviceInterest);
                cleanupSession(businessId);
                return `✅ Thank you, ${name}! We've recorded your details for **${serviceInterest}**. Our team will reach out to you soon!`;
            } catch (error) {
                console.error("❌ Error saving lead:", error);
                return "⚠️ Sorry, there was an error processing your request. Please try again.";
            }
        }

        // Fetch business data
        const businessData = await getBusinessDataForChatbot(businessId);
        if (!businessData) {
            return "⚠️ Sorry, I couldn't fetch business details at the moment.";
        }

        // Detect service from message
        const detectedService = detectService(message, businessData.services);
        
        // Update memory with new message
        const updatedMemory = updateSessionMemory(businessId, message, detectedService);

        // Generate appropriate response
        let response;
        if (detectedService || updatedMemory.currentService) {
            response = generateResponse(updatedMemory, serviceInfo, updatedMemory.lastQuestion);
        } else {
            response = generateFallbackResponse(getAllServiceNames());
        }

        // Store bot's response
        storeBotResponse(businessId, response, updatedMemory.currentService);
        
        return response;

    } catch (error) {
        console.error("❌ Error handling chat message:", error);
        return "⚠️ Sorry, there was an error processing your request.";
    }
};