import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates an AI-powered response when template-based responses are not sufficient
 * @param {string} message - User's message
 * @param {Array} messageHistory - Conversation history
 * @param {Object} businessData - Business information
 * @returns {Object} Response payload
 */
export const generateAIFallbackResponse = async (message, messageHistory = [], businessData = {}, language = 'en') => {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        // Build context from business data
        const businessContext = buildBusinessContext(businessData);
        
        // Build conversation history for context
        const conversationHistory = messageHistory
            .slice(-10) // Last 10 messages for context
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        // Add language instruction to system prompt
        const languageInstruction = language !== 'en' ? `\n\nIMPORTANT: Please respond in ${language === 'es' ? 'Spanish' : language === 'it' ? 'Italian' : language}.` : '';

        // Language-specific contact requests
        const contactRequests = {
            'en': "Would you like to schedule a consultation? I'd be happy to help you book an appointment.",
            'es': "¿Te gustaría programar una consulta? Estaré encantado de ayudarte a agendar una cita.",
            'it': "Vorresti programmare una consulenza? Sarei felice di aiutarti a prenotare un appuntamento."
        };

        const systemPrompt = `You are a helpful dental office assistant. ${businessContext}

Your role is to:
- Be friendly and professional
- Help patients with dental-related questions
- Provide valuable, informative responses (2-3 sentences)
- Give specific information about services, procedures, or dental care
- Keep responses concise but informative${languageInstruction}

IMPORTANT RULES:
- Provide actual value and information in your response
- Give specific details about services, procedures, or dental care
- Be conversational and natural - don't force contact requests in every response
- Only ask for contact info when it makes sense in the conversation flow
- If the user wants to book, schedule, or consult, ALWAYS ask for their name, phone, and email in a single message, and NEVER ask about days, times, or calendar availability. Do not ask about preferred days or times for appointments.
- Keep responses to 2-3 sentences maximum
- Use emojis to make the response more engaging and friendly
- If the user asks about scheduling or shows interest, naturally offer to help with booking

Current conversation context:
${conversationHistory}

User's current message: ${message}

Please provide a helpful, informative response that gives value to the user.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 150,
            temperature: 0.5
        });

        const response = completion.choices[0]?.message?.content || 
            "I apologize, but I'm having trouble processing your request right now. Please try again or call us directly.";

        return {
            type: 'AI_FALLBACK',
            response: response
        };

    } catch (error) {
        console.error("Error in generateAIFallbackResponse:", error);
        return {
            type: 'AI_FALLBACK',
            response: "I apologize, but I'm having trouble processing your request right now. Please try again or call us directly."
        };
    }
};

/**
 * Builds business context for AI responses
 * @param {Object} businessData - Business information
 * @returns {string} Formatted business context
 */
const buildBusinessContext = (businessData) => {
    if (!businessData) return "You work for a dental office.";

    let context = `You work for ${businessData.name || businessData.businessName || 'a dental office'}.`;

    if (businessData.businessDescription || businessData.description) {
        context += ` ${businessData.businessDescription || businessData.description}`;
    }

    if (businessData.phone) {
        context += ` Phone: ${businessData.phone}.`;
    }
    if (businessData.email) {
        context += ` Email: ${businessData.email}.`;
    }
    if (businessData.address) {
        let address = businessData.address;
        if (businessData.city) address += `, ${businessData.city}`;
        if (businessData.state) address += `, ${businessData.state}`;
        if (businessData.zipCode) address += ` ${businessData.zipCode}`;
        context += ` Address: ${address}.`;
    }

    if (businessData.services && businessData.services.length > 0) {
        const serviceNames = businessData.services.map(s => s.name).join(', ');
        context += ` Services: ${serviceNames}.`;
    }

    if (businessData.operatingHours) {
        context += ` Operating hours: ${businessData.operatingHours}`;
    }

    return context;
}; 