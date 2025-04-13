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
    understanding: "I understand you're interested in learning more about this. As a dental assistant, I want to ensure you get the most accurate information. Would you like me to connect you with our specialist who can provide detailed information about this procedure?",
    contact_request: "Perfect! To connect you with our specialist, I'll need your name, phone number, and email address. 😊",
    emergency: "I understand you're in severe pain - this is an emergency that needs immediate attention! 🚨 Let me help you get an urgent appointment RIGHT NOW. Please quickly share your name, phone number, and email, and our emergency dental team will contact you immediately. We prioritize emergency cases and will get you seen as soon as possible! 🏥",
    dental_problem: (problem) => `I understand your concern about ${problem}. This should be evaluated by our dental team. Let me help you schedule a consultation - what's your name, phone number, and email?`,
    service_inquiry: (service) => `As a dental assistant, I want to ensure you get the most accurate information about ${service}. Our specialist would be happy to explain everything in detail. What's your name, phone number, and email so I can arrange this?`,
    contact_confirmation: (name, service, phone) => 
        `✅ Thank you ${name}! I've noted your interest in ${service}. Our specialist will contact you at ${phone} to provide detailed information and answer all your questions. 😊`,
    procedure_inquiry: "As a dental assistant, I cannot provide specific details about dental procedures. However, I can connect you with our specialist who can explain everything thoroughly. Would you like that?",
    contact_after_yes: "Great! I'll just need your name, phone number, and email to set this up. 😊",
    waiting_for_contact: "I'm ready to connect you with our specialist. Just share your name, phone number, and email, and I'll take care of the rest."
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
    
    console.log('Handling service inquiry for message:', normalizedMessage);
    console.log('Available services:', JSON.stringify(services, null, 2));

    // Try to find a matching service from the database
    let matchingService = null;

    // First check for direct mentions (e.g., "interested in teeth whitening")
    for (const service of services) {
        if (!service || !service.name) continue;
        
        const serviceName = service.name.toLowerCase().replace(/\s+/g, ' ').trim();
        console.log('Checking service:', serviceName);

        // Direct match for "interested in X" format
        if (normalizedMessage.includes(`interested in ${serviceName}`)) {
            console.log('Found exact match for interested in:', service.name);
            matchingService = service;
            break;
        }

        // Match all words in the service name
        const serviceWords = serviceName.split(' ');
        const allWordsMatch = serviceWords.every(word => 
            normalizedMessage.includes(word.toLowerCase())
        );

        if (allWordsMatch) {
            console.log('Found all words match for:', service.name);
            matchingService = service;
            break;
        }
    }

    // If a specific service is found in the database
    if (matchingService) {
        console.log('Generating response for service:', matchingService.name);
        console.log('Service details:', JSON.stringify(matchingService, null, 2));
        
        // Get service description or use default
        const serviceDescription = matchingService.description || 
            `${matchingService.name} is one of our specialized dental services`;

        console.log('Using description:', serviceDescription);

        // Return service-specific response
        return {
            type: 'SERVICE_INQUIRY',
            detectedService: matchingService.name,
            serviceContext: matchingService.name,
            response: `${serviceDescription}\n\nWould you like to schedule a consultation with our ${matchingService.name} specialist? I can help arrange that. 😊`
        };
    }

    return null;
};

const generateEmergencyResponse = (messageHistory, message) => {
    // If this is the first mention of pain
    if (!messageHistory.some(msg => msg.content?.toLowerCase().includes('pain'))) {
        return {
            type: 'EMERGENCY',
            response: RESPONSE_TEMPLATES.emergency
        };
    }

    // If they're asking about treatment without providing contact
    if (message.toLowerCase().includes('how') || message.toLowerCase().includes('what')) {
        return {
            type: 'EMERGENCY',
            response: "🚨 This requires immediate attention from our emergency dental team. Please provide your contact details right away so we can get you the urgent care you need! "
        };
    }

    // If they've asked multiple times without providing contact
    return {
        type: 'EMERGENCY',
        response: "🚨 I want to help you get emergency dental care immediately. Please share your contact information right now, and our emergency team will call you as soon as possible! "
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
        console.log('Generating response for message:', message);
        console.log('Business data:', JSON.stringify(businessData, null, 2));

        // FIRST check for service inquiries - this takes priority
        if (normalizedMessage.includes('interested in') || 
            normalizedMessage.includes('about') || 
            normalizedMessage.includes('want')) {
            console.log('Detected service interest, checking services...');
            const serviceInquiry = await handleServiceInquiry(message, businessData);
            if (serviceInquiry) {
                console.log('Service inquiry response:', serviceInquiry);
                return serviceInquiry;
            }
        }

        // Then check for contact information
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

        // Handle "yes" responses when we're waiting for contact info
        const lastMessage = messageHistory[messageHistory.length - 1];
        if (lastMessage && 
            (normalizedMessage === 'yes' || normalizedMessage === 'sure' || normalizedMessage === 'okay' || normalizedMessage === 'ok')) {
            return {
                type: 'CONTACT_REQUEST',
                response: RESPONSE_TEMPLATES.contact_after_yes
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

        // Check for general service inquiries
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
