import OpenAI from "openai";
import dotenv from "dotenv";
import { extractContactInfo } from "./memoryHelpers.js";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Personality traits for consistent tone
const CHATBOT_PERSONALITY = {
    traits: [
        "professional but warm",
        "empathetic and understanding",
        "knowledgeable about dental procedures",
        "helpful without being pushy",
        "takes serious dental concerns seriously"
    ],
    rules: [
        "Never dismiss serious dental concerns",
        "Don't pretend to be a dentist but show understanding",
        "Acknowledge the user's concerns before asking for information",
        "For complex procedures, emphasize consultation importance",
        "Only ask for contact after building trust"
    ]
};

// Conversation stage tracking
const CONVERSATION_STAGES = {
    GREETING: 'greeting',
    UNDERSTANDING_NEEDS: 'understanding_needs',
    PROVIDING_INFO: 'providing_info',
    CONTACT_COLLECTION: 'contact_collection'
};

// Enhanced response templates for different stages
const RESPONSE_TEMPLATES = {
    greeting: {
        initial: "Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs.",
        followUp: "Is there a specific dental service you'd like to know more about?"
    },
    services_list: "Here are the dental services we offer:\n{services_list}\n\nWhich service would you like to know more about?",
    
    service_info: {
        "Cosmetic Dentistry": {
            description: "Yes! We offer a comprehensive range of cosmetic dentistry services including professional teeth whitening, porcelain veneers, dental bonding, smile makeovers, and Invisalign clear aligners.\n\n" +
                "I'd be happy to help you schedule a consultation with our cosmetic dentistry specialist. Could you please provide:\n" +
                "• Your name\n" +
                "• Phone number\n" +
                "• Email\n\n" +
                "This will help us contact you and discuss your specific cosmetic dentistry needs.",
            followUp: "Which cosmetic dental service interests you the most?"
        }
    },
    
    dental_concerns: {
        discoloration: "I understand your concern about the discoloration on your tooth. To schedule an examination, please provide your:\n• Name\n• Phone number\n• Email",
        cavity: "I understand your concern about what might be a cavity. To schedule an examination, please provide your:\n• Name\n• Phone number\n• Email",
        general: "I understand your dental concern. To schedule an examination, please provide your:\n• Name\n• Phone number\n• Email"
    }
};

const handleServiceInquiry = async (message, context) => {
    const normalizedMessage = message.toLowerCase();
    const services = context.services || [];
    
    // Find matching service from database
    const matchingService = services.find(service => {
        const serviceName = service.name.toLowerCase();
        // Check for exact service name
        if (normalizedMessage.includes(serviceName)) {
            return true;
        }
        
        // Check for common variations
        if (serviceName === 'cosmetic dentistry' && 
            (normalizedMessage.includes('cosmetic') || 
             normalizedMessage.includes('consmetic') || 
             normalizedMessage.includes('aesthetic'))) {
            return true;
        }
        
        // Check for specific treatments that are part of services
        if (serviceName === 'cosmetic dentistry' && 
            (normalizedMessage.includes('veneer') || 
             normalizedMessage.includes('whitening') || 
             normalizedMessage.includes('bonding') || 
             normalizedMessage.includes('invisalign'))) {
            return true;
        }
        
        return false;
    });

    if (matchingService) {
        const response = `${matchingService.description}\n\nWould you like to schedule an appointment for ${matchingService.name}? To help you better, please provide your:\n• Name\n• Phone number\n• Email`;
        
        return {
            response,
            detectedService: matchingService.name,
            shouldAskContact: true
        };
    }

    // Only if no specific service was found, check for general service inquiry
    if (normalizedMessage.includes('service') || 
        normalizedMessage.includes('provide') || 
        normalizedMessage.includes('offer')) {
        
        const serviceList = services.map(s => `• ${s.name}`).join('\n');
        return {
            response: `We offer the following dental services:\n\n${serviceList}\n\nWhich service would you like to know more about?`,
            detectedService: null,
            shouldAskContact: false
        };
    }

    return null;
};

export const generateAIResponse = async (message, businessData, messageHistory = []) => {
    try {
        // Check for contact information first
        const contactInfo = extractContactInfo(message);
        if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
            // Get the last detected service from message history
            const lastServiceMessage = messageHistory
                .reverse()
                .find(msg => msg.detectedService);
            
            const serviceInterest = lastServiceMessage?.detectedService || 'General Inquiry';
            
            return {
                type: 'CONTACT_INFO',
                contactInfo,
                serviceInterest,
                response: `Thank you ${contactInfo.name}! I've received your contact information. Our team will reach out to you shortly at ${contactInfo.email} or ${contactInfo.phone} to schedule your appointment.`
            };
        }

        // If no contact info, proceed with service inquiries
        const serviceInquiryResponse = await handleServiceInquiry(message, businessData);
        if (serviceInquiryResponse) {
            return {
                type: 'SERVICE_INQUIRY',
                detectedService: serviceInquiryResponse.detectedService,
                response: serviceInquiryResponse.response
            };
        }

        const messageLower = message.toLowerCase().trim();
        
        // Define common variables at the top
        const lastBotMessage = messageHistory.length > 0 ? 
            messageHistory[messageHistory.length - 1].message.toLowerCase() : '';
        
        // Check if the last message was asking about scheduling and user confirmed
        const wasAskingToSchedule = lastBotMessage.includes('would you like to schedule');
        const isAffirmative = ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup'].includes(messageLower);

        // If user confirmed scheduling, ask for contact info
        if (wasAskingToSchedule && isAffirmative) {
            return {
                type: 'ASKING_CONTACT',
                response: "Great! To help you schedule an appointment, please provide your:\n• Name\n• Phone number\n• Email"
            };
        }

        // Only show greeting for actual greetings
        const isGreeting = messageLower === 'hi' || 
                          messageLower === 'hello' || 
                          messageLower === 'hey' ||
                          messageLower === 'good morning' ||
                          messageLower === 'good afternoon' ||
                          messageLower === 'good evening';
        
        if (isGreeting) {
            return {
                type: 'GREETING',
                response: RESPONSE_TEMPLATES.greeting.initial
            };
        }

        // Check for dental concerns
        const hasDentalConcern = 
            messageLower.includes('tooth') || 
            messageLower.includes('teeth') || 
            messageLower.includes('dental') || 
            messageLower.includes('mouth');

        if (hasDentalConcern) {
            let concernType = 'general';
            // Check for specific concerns
            if (messageLower.includes('brown') || 
                messageLower.includes('black') || 
                messageLower.includes('dark') || 
                messageLower.includes('stain') || 
                messageLower.includes('color')) {
                concernType = 'discoloration';
            } else if (messageLower.includes('cavity') || 
                messageLower.includes('hole') || 
                messageLower.includes('decay')) {
                concernType = 'cavity';
            }

            return {
                type: 'DENTAL_CONCERN',
                concernType,
                response: RESPONSE_TEMPLATES.dental_concerns[concernType]
            };
        }

        // For any other messages, ask how we can help
        return {
            type: 'DEFAULT',
            response: RESPONSE_TEMPLATES.greeting.followUp
        };

    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return {
            type: 'ERROR',
            response: "I apologize, but I'm having trouble understanding. Could you please rephrase your question about our dental services?"
        };
    }
};
