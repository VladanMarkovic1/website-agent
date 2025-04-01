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
    greeting: "Welcome to {businessName}! How can we help you today?",
    prosthesis_emergency: "I understand your prosthesis is broken and needs fixing. Our dental team can help with this right away. Would you like to schedule an urgent appointment?",
    broken_dental_work: "I understand your {device} is broken and needs attention. Our dental team can help with this right away. Would you like to schedule an urgent appointment?",
    dental_service: "I understand you're interested in {service}. Our experienced dental team can help you with this. Would you like me to explain the process and what you can expect?",
    filling_specific: "I understand you need help with a dental filling. Our dentists are experienced in both placing new fillings and correcting existing ones. Would you like to know more about our filling procedures?",
    emergency: "I understand this is an urgent situation. Our dental team can help you with this right away. Would you like to schedule an emergency appointment?",
    contact_request: {
        standard: "To schedule your appointment, could you please provide your name, phone number, and email address?",
        urgent: "To help you with this urgent matter, please provide your name, phone number, and email address so we can schedule your appointment right away."
    },
    followup: "Based on your concern, would you like me to schedule an appointment for you?"
};

export const generateAIResponse = async (message, businessData, messageHistory = []) => {
    try {
        const isFirstMessage = !messageHistory || messageHistory.length === 0;
        const messageLower = message.toLowerCase().trim();
        
        // Only send welcome for actual greetings
        const isGreeting = messageLower === 'hi' || 
                          messageLower === 'hello' || 
                          messageLower === 'hey' ||
                          messageLower === 'good morning' ||
                          messageLower === 'good afternoon' ||
                          messageLower === 'good evening';
        
        if (isGreeting) {
            return RESPONSE_TEMPLATES.greeting.replace('{businessName}', businessData.businessName);
        }

        // Check for pain/hurt first as highest priority
        if (messageLower.includes('pain') || messageLower.includes('hurt') || messageLower.includes('ache')) {
            return RESPONSE_TEMPLATES.emergency;
        }

        // Check for emergency situations
        if (messageLower.includes('prosthesis') && (messageLower.includes('broke') || messageLower.includes('fix'))) {
            return RESPONSE_TEMPLATES.prosthesis_emergency;
        }

        if (messageLower.includes('broken') || messageLower.includes('fix')) {
            let device = 'dental work';
            if (messageLower.includes('denture')) device = 'denture';
            if (messageLower.includes('crown')) device = 'crown';
            if (messageLower.includes('bridge')) device = 'bridge';
            if (messageLower.includes('prosthesis')) device = 'prosthesis';
            if (messageLower.includes('teeth') || messageLower.includes('tooth')) device = 'tooth';
            return RESPONSE_TEMPLATES.broken_dental_work.replace('{device}', device);
        }

        // Check for affirmative response
        const isAffirmative = ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup'].includes(messageLower);
        
        // Get last bot message to check context
        const lastBotMessage = messageHistory.length > 0 ? 
            messageHistory[messageHistory.length - 1].message.toLowerCase() : '';
        
        const wasAskingToSchedule = lastBotMessage.includes('schedule') || 
                                  lastBotMessage.includes('appointment');

        // If user said yes to scheduling, immediately ask for contact
        if (isAffirmative && wasAskingToSchedule) {
            // Use urgent template if the last message was about emergency/urgent care
            if (lastBotMessage.includes('urgent') || lastBotMessage.includes('emergency')) {
                return RESPONSE_TEMPLATES.contact_request.urgent;
            }
            return RESPONSE_TEMPLATES.contact_request.standard;
        }

        // Default OpenAI prompt for other cases
        const prompt = `
            You are a dental office assistant for ${businessData.businessName}. 
            
            PERSONALITY:
            - Professional but warm and friendly
            - Knowledgeable about dental procedures
            - Helpful without being pushy
            
            CRITICAL RULES:
            1. NEVER start responses with "Regarding [Service]:"
            2. ALWAYS acknowledge the specific problem first
            3. Keep responses focused and relevant
            4. Don't ask for contact information unless user shows clear interest
            5. Maximum 2-3 sentences per response
            6. Focus on helping with the specific issue mentioned
            7. Don't try to categorize the problem into a service
            8. For tooth pain or discomfort, treat as urgent
            
            Current conversation:
            ${messageHistory.map(m => `${m.isUser ? 'User' : 'Assistant'}: ${m.message}`).join('\n')}
            
            User's latest message: "${message}"
            
            Respond naturally and professionally, focusing specifically on the user's concern.
        `;

        // Format conversation history to proper structure
        const formattedHistory = messageHistory.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.message
        }));

        // Prepare context
        const contextToInclude = `
CONTEXT:
Emergency Situation: ${messageLower.includes('emergency')}
Is Affirmative Response: ${isAffirmative}
Was Asking to Schedule: ${wasAskingToSchedule}

CRITICAL RULES:
1. NEVER give medical or health advice
2. NEVER suggest remedies or treatments
3. Keep responses under 2 sentences
4. When asking for contact info, ALWAYS specify need for name, phone, and email
5. NEVER ask for preferred time or date
6. Stay focused on getting contact details for scheduling

RESPONSE STYLE:
- Maximum 2 sentences
- Direct and focused
- No medical advice
- Always ask for name, phone, and email together
- ${messageLower.includes('emergency') ? 'Immediate scheduling focus' : 'Simple and brief'}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: "You are a dental receptionist who ONLY collects name, phone, and email for scheduling. NEVER ask for preferred time or date."
                },
                ...formattedHistory,
                { 
                    role: "user", 
                    content: contextToInclude + "\n\nCurrent message: " + message
                }
            ],
            temperature: 0.7,
            max_tokens: 100
        });

        let aiResponse = response.choices[0]?.message?.content.trim();

        if (aiResponse) {
            aiResponse = aiResponse.replace(/[*#_`]/g, '');
            
            // For emergencies without scheduling context
            if (messageLower.includes('emergency') && !wasAskingToSchedule && !aiResponse.toLowerCase().includes("schedule") && !aiResponse.toLowerCase().includes("appointment")) {
                aiResponse = "I understand this is urgent. Would you like to schedule an emergency appointment?";
            }

            // If response includes asking for contact but doesn't specify all required fields
            if ((aiResponse.toLowerCase().includes("contact") || 
                 aiResponse.toLowerCase().includes("provide") || 
                 aiResponse.toLowerCase().includes("details")) && 
                (!aiResponse.toLowerCase().includes("name") || 
                 !aiResponse.toLowerCase().includes("phone") || 
                 !aiResponse.toLowerCase().includes("email"))) {
                aiResponse = RESPONSE_TEMPLATES.contact_request.standard;
            }
        }

        return aiResponse || "How can I assist you today?";
    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return "How can I assist you today?";
    }
};
