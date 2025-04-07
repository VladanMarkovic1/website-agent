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

// Common greetings and their variations
const GREETINGS = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'hi there', 'hello there', 'greetings'
];

// Enhanced response templates for different stages
const RESPONSE_TEMPLATES = {
    greeting: "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
    understanding: "I understand you need help with that. Could you tell me more about what you're looking for?",
    contact_request: "I understand you need help with that. If you could share your name, phone number, and email, I'll have our dental team reach out to assist you personally. 😊",
    emergency: "I'm so sorry to hear you're in pain! 😟 Let me help get you taken care of right away. Could you share your name, phone number, and email so our dental team can contact you immediately?",
    service_inquiry: (service) => `${service.description}\n\n✨ I can help you schedule a time to come in. Just share your name, phone number, and email, and our team will get back to you to find a time that works best for you.`,
    contact_confirmation: (name, service, phone) => 
        `✅ Thank you ${name} for showing interest in ${service}! We believe we can help you, and we will contact you on ${phone} as soon as possible. 😊`
};

const isGreeting = (message) => {
    const normalizedMsg = message.toLowerCase().trim();
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && message.length < 20;
};

const handleServiceInquiry = async (message, context) => {
    const normalizedMessage = message.toLowerCase();
    const services = context.services || [];
    
    // Check if any service from DB is mentioned in the message
    const matchingService = services.find(service => 
        normalizedMessage.includes(service.name.toLowerCase())
    );

    // If asking about a specific service
    if (matchingService) {
        const response = matchingService.description 
            ? `${matchingService.description} I'd love to tell you more about this in person - would you like to schedule a consultation? Just share your name and contact details, and I'll make sure you're booked with the right specialist.`
            : `We do offer ${matchingService.name}. I'd be happy to have one of our specialists discuss this with you in detail. If you'd like to learn more, I can schedule a consultation - just share your name, phone number, and email.`;

        return {
            matchingService,
            response,
            detectedService: matchingService.name,
            shouldAskContact: true
        };
    }

    // If asking about services in general
    if (normalizedMessage.includes('service') || 
        normalizedMessage.includes('provide') || 
        normalizedMessage.includes('offer') ||
        normalizedMessage.includes('what') ||
        normalizedMessage.includes('which')) {
        
        // Group services by category if available
        const servicesByCategory = services.reduce((acc, service) => {
            const category = service.category || 'General Services';
            if (!acc[category]) acc[category] = [];
            acc[category].push(service.name);
            return acc;
        }, {});

        let servicesList = '';
        if (Object.keys(servicesByCategory).length > 1) {
            // If we have categories, list services by category
            servicesList = Object.entries(servicesByCategory)
                .map(([category, services]) => 
                    `${category}:\n${services.map(s => `• ${s}`).join('\n')}`
                )
                .join('\n\n');
        } else {
            // Simple list if no categories
            servicesList = services.map(s => `• ${s.name}`).join('\n');
        }

        const response = `We offer a comprehensive range of dental services including:\n\n${servicesList}\n\nIs there a particular service you'd like to know more about? I'd be happy to explain any of these in detail or help you schedule an appointment.`;

        return {
            matchingService: null,
            response,
            detectedService: null,
            shouldAskContact: false
        };
    }

    return null;
};

const generateEmergencyResponse = (messageHistory, message) => {
    // If this is the first mention of pain
    if (!messageHistory.some(msg => msg.content?.toLowerCase().includes('pain'))) {
        return {
            type: 'EMERGENCY',
            response: "😟 I understand you're experiencing discomfort. Let me help you schedule an appointment with our dental team right away. Could you share your name, phone number, and email?"
        };
    }

    // If they're asking about treatment without providing contact
    if (message.toLowerCase().includes('how') || message.toLowerCase().includes('what')) {
        return {
            type: 'EMERGENCY',
            response: "Our dental team will need to examine you in person. Could you share your contact details so we can schedule an urgent appointment for you? 🏥"
        };
    }

    // If they've asked multiple times without providing contact
    return {
        type: 'EMERGENCY',
        response: "I'd like to help you schedule an urgent appointment with our dental team. Could you share your contact information so we can get that set up for you right away? 🙏"
    };
};

const generateServiceResponse = (service, messageHistory) => {
    if (!service) {
        return "✨ I can help you schedule an appointment with the right specialist. What's the best way to reach you?";
    }

    // Check if we've already described this service
    const previousServiceMention = messageHistory.find(msg => 
        msg.type === 'SERVICE_INQUIRY' && msg.detectedService === service.name
    );

    if (previousServiceMention) {
        return `Great choice! 🌟 I can get you scheduled for ${service.name}. What's the best phone number and email to reach you at?`;
    }

    // If service has a description, use it, otherwise use a generic response
    if (service.description) {
        return `${service.description}\n\n✨ Would you like to schedule a consultation to learn more? Just let me know your contact details, and I'll have our ${service.name} specialist reach out to you.`;
    }

    return `I'd be happy to have our ${service.name} specialist tell you more about this service in person. 😊 Would you like me to arrange a consultation? Just share your contact details, and I'll take care of the rest.`;
};

export const generateAIResponse = async (message, businessData, messageHistory = []) => {
    try {
        const normalizedMessage = message.toLowerCase();
        
        // Check for contact information first
        const contactInfo = extractContactInfo(message);
        if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
            const service = messageHistory.find(msg => msg.type === 'SERVICE_INQUIRY')?.detectedService || 'our dental services';
            
            return {
                type: 'CONTACT_INFO',
                contactInfo,
                serviceInterest: service,
                response: `Perfect, thank you ${contactInfo.name}! I'll have our team reach out to you at ${contactInfo.phone} to schedule your appointment${service !== 'our dental services' ? ` for ${service}` : ''}. They'll be able to answer any additional questions you might have.`
            };
        }

        // Handle initial greeting
        if (messageHistory.length === 0 || isGreeting(message)) {
            return {
                type: 'GREETING',
                response: "👋 Hi there! I'm here to help you learn about our services or schedule an appointment. What brings you in today? 😊"
            };
        }

        // Check for emergency keywords
        if (normalizedMessage.includes('pain') || 
            normalizedMessage.includes('hurt') || 
            normalizedMessage.includes('emergency') ||
            normalizedMessage.includes('bleeding') ||
            normalizedMessage.includes('swollen')) {
            return generateEmergencyResponse(messageHistory, message);
        }

        // Check for service inquiries
        const serviceInquiryResponse = await handleServiceInquiry(message, businessData);
        if (serviceInquiryResponse) {
            return {
                type: 'SERVICE_INQUIRY',
                detectedService: serviceInquiryResponse.detectedService,
                response: serviceInquiryResponse.response
            };
        }

        // If the message is short and doesn't provide much context
        if (message.length < 30 && messageHistory.length < 2) {
            return {
                type: 'UNDERSTANDING',
                response: "I'd be happy to help. Could you tell me more about what you're interested in? That way, I can provide the most relevant information or connect you with the right specialist."
            };
        }

        // Default response for any other message
        const hasAskedForContact = messageHistory.some(msg => 
            msg.role === 'assistant' && msg.content.toLowerCase().includes('contact')
        );

        return {
            type: 'DEFAULT',
            response: hasAskedForContact
                ? "I'd love to help you with that. To get you scheduled with the right specialist, could you share your contact information?"
                : "I can definitely help you with that. Would you like to schedule a consultation? Just share your name, phone number, and email, and I'll take care of the rest."
        };

    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return {
            type: 'ERROR',
            response: "I want to make sure I understand exactly what you're looking for. Could you rephrase that for me?"
        };
    }
};
