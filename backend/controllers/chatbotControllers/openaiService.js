import OpenAI from "openai";
import dotenv from "dotenv";

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
    greeting: "Hello! How can I assist you with your dental needs today?",
    
    services_list: "Here are the dental services we offer:\n{services_list}\n\nWhich service would you like to know more about?",
    
    service_info: {
        details: "{service_details}\n\nWould you like to schedule this service?",
        contact: "To help you schedule {service_name}, I'll need your name, phone number, and email address."
    },
    
    dental_concerns: {
        discoloration: "I understand your concern about the discoloration on your tooth. Would you like me to help you schedule an examination?",
        cavity: "I understand your concern about what might be a cavity. Would you like me to help you schedule an examination?",
        general: "I understand your dental concern. Would you like me to help you schedule an examination?"
    }
};

export const generateAIResponse = async (message, businessData, messageHistory = []) => {
    try {
        const messageLower = message.toLowerCase().trim();
        
        // Define common variables at the top
        const lastBotMessage = messageHistory.length > 0 ? 
            messageHistory[messageHistory.length - 1].message.toLowerCase() : '';
        
        // Check if the last message was asking about scheduling and user confirmed
        const wasAskingToSchedule = lastBotMessage.includes('would you like to schedule');
        const isAffirmative = ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup'].includes(messageLower);

        // If user confirmed scheduling, find which service they were asking about
        if (wasAskingToSchedule && isAffirmative) {
            // Find the service name from the last bot message
            const serviceMatch = businessData.services.find(service => 
                lastBotMessage.includes(service.name.toLowerCase())
            );
            
            if (serviceMatch) {
                return RESPONSE_TEMPLATES.service_info.contact
                    .replace('{service_name}', serviceMatch.name);
            }
        }
        
        // Check for services inquiry
        if (messageLower.includes('what services') || 
            messageLower.includes('which services') || 
            messageLower.includes('services you offer') ||
            messageLower.includes('services do you offer') ||
            messageLower.includes('services available') ||
            messageLower.includes('available services') ||
            messageLower.includes('which service you') ||
            messageLower.includes('what service you') ||
            messageLower.includes('service you guys') ||
            messageLower.includes('services you guys') ||
            (messageLower.includes('service') && messageLower.includes('offer'))) {
            
            const servicesList = businessData.services
                .map(service => `• ${service.name}${service.price ? ` - ${service.price}` : ''}`)
                .join('\n');

            return RESPONSE_TEMPLATES.services_list.replace('{services_list}', servicesList);
        }

        // Check for service interest or inquiry
        let serviceMatch = null;
        const interestPhrases = [
            'interested in',
            'want to know about',
            'tell me about',
            'explain me more about',
            'explain more about',
            'can you explain',
            'what about',
            'how about',
            'more about',
            'learn about',
            'know about'
        ];

        // First, try to find exact service match
        for (const service of businessData.services) {
            const serviceName = service.name.toLowerCase();
            const cleanMessage = messageLower.replace(/[^a-z0-9\s]/g, '');
            const cleanService = serviceName.replace(/[^a-z0-9\s]/g, '');
            
            // Check for direct mention
            if (cleanMessage.includes(cleanService)) {
                serviceMatch = service;
                break;
            }

            // Check for interest phrases
            for (const phrase of interestPhrases) {
                if (messageLower.includes(phrase)) {
                    const afterPhrase = messageLower.split(phrase)[1]?.trim();
                    if (afterPhrase && afterPhrase.replace(/[^a-z0-9\s]/g, '').includes(cleanService)) {
                        serviceMatch = service;
                        break;
                    }
                }
            }
            if (serviceMatch) break;
        }

        if (serviceMatch) {
            console.log("Found service match:", serviceMatch.name);
            
            // Build comprehensive service information
            let serviceInfo = '';
            
            // Add description if available
            if (serviceMatch.description) {
                serviceInfo += serviceMatch.description + "\n\n";
            }
            
            // Add price if available
            if (serviceMatch.price) {
                serviceInfo += `Price: ${serviceMatch.price}\n\n`;
            }
            
            // Add duration if available
            if (serviceMatch.duration) {
                serviceInfo += `Duration: ${serviceMatch.duration}\n\n`;
            }
            
            // Add benefits if available
            if (serviceMatch.benefits && serviceMatch.benefits.length > 0) {
                serviceInfo += "Benefits:\n";
                serviceMatch.benefits.forEach(benefit => {
                    serviceInfo += `• ${benefit}\n`;
                });
                serviceInfo += "\n";
            }
            
            // Add procedure steps if available
            if (serviceMatch.steps && serviceMatch.steps.length > 0) {
                serviceInfo += "Procedure Steps:\n";
                serviceMatch.steps.forEach((step, index) => {
                    serviceInfo += `${index + 1}. ${step}\n`;
                });
                serviceInfo += "\n";
            }

            // If no information is available, use a generic message
            if (!serviceInfo.trim()) {
                serviceInfo = "This is one of our professional dental services. Please ask our staff for more details.";
            }

            return RESPONSE_TEMPLATES.service_info.details
                .replace('{service_details}', serviceInfo.trim());
        }

        // Only show greeting for actual greetings
        const isGreeting = messageLower === 'hi' || 
                          messageLower === 'hello' || 
                          messageLower === 'hey' ||
                          messageLower === 'good morning' ||
                          messageLower === 'good afternoon' ||
                          messageLower === 'good evening';
        
        if (isGreeting) {
            return RESPONSE_TEMPLATES.greeting;
        }

        // Check for dental concerns
        const hasDentalConcern = 
            messageLower.includes('tooth') || 
            messageLower.includes('teeth') || 
            messageLower.includes('dental') || 
            messageLower.includes('mouth');

        if (hasDentalConcern) {
            // Check for specific concerns
            if (messageLower.includes('brown') || 
                messageLower.includes('black') || 
                messageLower.includes('dark') || 
                messageLower.includes('stain') || 
                messageLower.includes('color')) {
                return RESPONSE_TEMPLATES.dental_concerns.discoloration;
            }
            
            if (messageLower.includes('cavity') || 
                messageLower.includes('hole') || 
                messageLower.includes('decay')) {
                return RESPONSE_TEMPLATES.dental_concerns.cavity;
            }

            return RESPONSE_TEMPLATES.dental_concerns.general;
        }

        // For any other messages
        return "How can I assist you with your dental needs today?";

    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return "How can I assist you today?";
    }
};
