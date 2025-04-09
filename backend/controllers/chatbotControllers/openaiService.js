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

// Dental problem indicators
const DENTAL_PROBLEMS = {
    pain: ['pain', 'hurt', 'ache', 'hurts', 'hurting', 'aching', 'painful'],
    sensitivity: ['sensitive', 'sensitivity', 'cold', 'hot', 'sweet'],
    damage: ['broken', 'chipped', 'cracked', 'loose', 'missing'],
    emergency: ['bleeding', 'swollen', 'swelling', 'infection', 'abscess'],
    general: ['cavity', 'decay', 'filling', 'tooth', 'teeth', 'gum', 'jaw']
};

// Common response templates
const RESPONSE_TEMPLATES = {
    greeting: "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
    understanding: "I understand you need help with that. Could you tell me more about what you're looking for?",
    contact_request: "I understand you need help with that. Please share your name, phone number, and email so our dental team can assist you personally. 😊",
    emergency: "I'm so sorry to hear you're in pain! 😟 Let me help get you taken care of right away. Please share your name, phone number, and email so our dental team can contact you immediately.",
    dental_problem: (problem) => `I understand you're experiencing issues with ${problem}. Our dental team will need to examine this. Could you share your name, phone number, and email so we can schedule you for an examination?`,
    service_inquiry: (service) => `${service.description}\n\nPlease share your name, phone number, and email, and our team will get back to you to find a time that works best for you.`,
    contact_confirmation: (name, service, phone) => 
        `✅ Thank you ${name} for showing interest in ${service}! We believe we can help you, and we will contact you on ${phone} as soon as possible. 😊`
};

const isGreeting = (message) => {
    const normalizedMsg = message.toLowerCase().trim();
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && message.length < 20;
};

const isDentalProblem = (message) => {
    const normalizedMsg = message.toLowerCase().trim();
    
    // Check each category of dental problems
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isIssue: true,
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    
    return { isIssue: false };
};

const handleServiceInquiry = async (message, context) => {
    const normalizedMessage = message.toLowerCase();
    const services = context.services || [];
    
    // Check if we have any services first
    if (!services || services.length === 0) {
        return {
            type: 'SERVICE_INQUIRY',
            response: "I apologize, but I don't have access to the services list at the moment. Please contact our office directly for information about our services."
        };
    }

    // Extract potential service name from the message using various patterns
    let detectedService = null;
    
    // Common patterns for service mentions
    const patterns = [
        /(?:about|explain|interested in|looking for|need|want)\s+([^?.!,]+)/i,
        /(?:tell me more about|information about|details about|learn about)\s+([^?.!,]+)/i,
        /(?:^|\s)([^?.!,]+?)(?:\s+treatment|\s+procedure|\s+service)/i
    ];

    // Try each pattern
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            detectedService = match[1].trim();
            break;
        }
    }

    // If no pattern match, try direct service name detection
    if (!detectedService) {
        // Get all service names from the database
        const serviceNames = services.map(s => s.name.toLowerCase());
        
        // Find the longest matching service name in the message
        let longestMatch = '';
        for (const serviceName of serviceNames) {
            if (normalizedMessage.includes(serviceName) && serviceName.length > longestMatch.length) {
                longestMatch = serviceName;
            }
        }
        
        if (longestMatch) {
            // Find the original cased version
            detectedService = services.find(s => s.name.toLowerCase() === longestMatch)?.name;
        }
    }

    // Find matching service from database
    const matchingService = detectedService ? 
        services.find(service => 
            service.name.toLowerCase() === detectedService.toLowerCase() ||
            service.name.toLowerCase().includes(detectedService.toLowerCase()) ||
            detectedService.toLowerCase().includes(service.name.toLowerCase())
        ) : null;

    // If asking about a specific service
    if (matchingService) {
        try {
            // Use the service description from the database
            const serviceDescription = matchingService.description || 
                `I'd be happy to tell you more about ${matchingService.name}. To ensure you get the most accurate and detailed information, I'd like to connect you with our specialist.`;
            
            return {
                type: 'SERVICE_INQUIRY',
                detectedService: matchingService.name,
                serviceContext: matchingService.name,
                response: `${serviceDescription}\n\nWould you like to schedule a consultation with our ${matchingService.name} specialist? Please share your name, phone number, and email, and I'll help get that set up for you. 😊`
            };
        } catch (error) {
            console.error("Error handling service inquiry:", error);
            return {
                type: 'SERVICE_INQUIRY',
                response: "I apologize for the technical difficulty. I'd be happy to have our specialist provide you with detailed information about this service. Please share your name, phone number, and email so they can reach out to you. 😊"
            };
        }
    }

    // If asking about what service they need or what can help them
    if (normalizedMessage.includes('what can help') || 
        normalizedMessage.includes('which service is for me') ||
        normalizedMessage.includes('what service do i need') ||
        normalizedMessage.includes('what do i need') ||
        normalizedMessage.includes('can help me') ||
        normalizedMessage.includes('best for me')) {
        
        return {
            type: 'SERVICE_INQUIRY',
            response: "As a dental assistant, I cannot make specific service recommendations as each patient's needs are unique. However, I'd be happy to connect you with our dental team who can properly evaluate your needs and recommend the best treatment options. Please share your name, phone number, and email so our team can reach out to you. 😊"
        };
    }

    // If asking about services in general
    if (normalizedMessage.includes('service') || 
        normalizedMessage.includes('provide') || 
        normalizedMessage.includes('offer') ||
        normalizedMessage.match(/\b(what|which)\b/)) {
        
        // Create a formatted list of services
        const servicesList = services.map(s => `• ${s.name}`).join('\n');
        
        return {
            type: 'SERVICE_INQUIRY',
            response: `Here are all the dental services we offer:\n\n${servicesList}\n\nTo discuss which service would be best for your specific needs, I'd be happy to connect you with our dental team. Please share your name, phone number, and email. 😊`
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

export const generateAIResponse = async (message, businessData, messageHistory = [], isNewSession = false) => {
    try {
        const normalizedMessage = message.toLowerCase();

        // Check for contact information first
        const contactInfo = extractContactInfo(message);
        if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
            return {
                type: 'CONTACT_INFO',
                response: RESPONSE_TEMPLATES.contact_confirmation(
                    contactInfo.name,
                    contactInfo.service || 'our dental services',
                    contactInfo.phone
                ),
                contactInfo,
                serviceContext: contactInfo.service
            };
        }

        // Check for dental problems
        const dentalProblem = isDentalProblem(message);
        if (dentalProblem.isIssue) {
            return {
                type: 'DENTAL_PROBLEM',
                response: dentalProblem.severity === 'high' 
                    ? RESPONSE_TEMPLATES.emergency
                    : RESPONSE_TEMPLATES.dental_problem(dentalProblem.category),
                problemCategory: dentalProblem.category,
                severity: dentalProblem.severity
            };
        }

        // Handle initial greeting
        if (isNewSession || isGreeting(message)) {
            return {
                type: 'GREETING',
                response: RESPONSE_TEMPLATES.greeting
            };
        }

        // Check for service inquiries
        const serviceInquiry = await handleServiceInquiry(message, businessData);
        if (serviceInquiry) {
            return serviceInquiry;
        }

        // Default response asking for more information
        return {
            type: 'GENERAL_INQUIRY',
            response: RESPONSE_TEMPLATES.understanding
        };
    } catch (error) {
        console.error("Error generating AI response:", error);
        return {
            type: 'ERROR',
            response: "I apologize, but I'm having trouble understanding. Could you please rephrase that?"
        };
    }
};
