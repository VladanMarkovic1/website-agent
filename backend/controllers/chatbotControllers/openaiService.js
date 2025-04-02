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
    
    treatments: {
        "veneers": {
            description: "Dental veneers are thin, custom-made shells of tooth-colored porcelain that cover the front surface of your teeth. They're an excellent solution for teeth that are stained, chipped, or have gaps. The procedure is minimally invasive and can dramatically improve your smile's appearance."
        },
        "whitening": {
            description: "Professional teeth whitening is a safe and effective way to remove stains and brighten your smile. We use advanced whitening techniques that can make your teeth several shades lighter in just one session."
        },
        "bonding": {
            description: "Dental bonding is a procedure where we apply a tooth-colored resin material to repair chipped, cracked, or discolored teeth. It's a cost-effective and quick solution for minor cosmetic dental issues."
        },
        "invisalign": {
            description: "Invisalign uses a series of clear, removable aligners to gradually straighten your teeth. Unlike traditional braces, they're virtually invisible and can be removed for eating and cleaning."
        },
        "crown": {
            description: "A dental crown is a cap that covers a damaged tooth to restore its shape, size, strength, and appearance. Crowns can protect weak teeth, restore broken teeth, or cover severely discolored teeth."
        },
        "implant": {
            description: "Dental implants are titanium posts surgically placed into your jawbone to replace missing teeth roots. They provide a strong foundation for permanent or removable replacement teeth that match your natural teeth."
        },
        "cleaning": {
            description: "Professional dental cleaning removes plaque and tartar buildup that regular brushing can't reach. This preventive care is essential for maintaining healthy teeth and gums and preventing dental problems."
        }
    },
    
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
    
    // Check if any service from DB is mentioned in the message
    const matchingService = services.find(service => 
        normalizedMessage.includes(service.name.toLowerCase())
    );

    if (matchingService) {
        return {
            response: `${matchingService.description}\n\nI can help you schedule a time to come in. Just share your name, phone number, and email, and our team will get back to you to find a time that works best for you.`,
            detectedService: matchingService.name,
            shouldAskContact: true
        };
    }

    // If no service found, politely ask for contact
    if (normalizedMessage.includes('service') || 
        normalizedMessage.includes('provide') || 
        normalizedMessage.includes('offer')) {
        return {
            response: "I'd love to help you find exactly what you need. Share your contact info with me, and our dental team will reach out to discuss how we can best help you.",
            detectedService: null,
            shouldAskContact: true
        };
    }

    return null;
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
                response: `Thank you ${contactInfo.name} for showing interests in ${service}, we believe we will help you, we will contact you on ${contactInfo.phone} as soon as possible, if you experience big pain call us immediately on ${businessData.phone}`
            };
        }

        // Check for emergency keywords first
        if (normalizedMessage.includes('pain') || 
            normalizedMessage.includes('hurt') || 
            normalizedMessage.includes('emergency') ||
            normalizedMessage.includes('bleeding') ||
            normalizedMessage.includes('swollen')) {
            return {
                type: 'EMERGENCY',
                response: "I'm sorry to hear you're in pain. Let me help get you taken care of right away. Could you share your name, phone number, and email so our dental team can contact you immediately?"
            };
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

        // Default response for any other message
        return {
            type: 'DEFAULT',
            response: "I understand you need help with that. If you could share your name, phone number, and email, I'll have our dental team reach out to assist you personally."
        };

    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return {
            type: 'ERROR',
            response: "I want to make sure you get the help you need. Could you share your contact details so our team can reach out to you directly?"
        };
    }
};
