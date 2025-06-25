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
export const generateAIFallbackResponse = async (message, messageHistory = [], businessData = {}) => {
    try {
        // Build context from business data
        const businessContext = buildBusinessContext(businessData);
        
        // Build conversation history for context
        const conversationHistory = messageHistory
            .slice(-10) // Last 10 messages for context
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const systemPrompt = `You are a helpful dental office assistant. ${businessContext}

Your role is to:
- Be friendly and professional
- Help patients with dental-related questions
- Guide them toward scheduling appointments when appropriate
- Provide accurate but general information (avoid giving specific medical advice)
- Keep responses concise and helpful

Current conversation context:
${conversationHistory}

User's current message: ${message}

Please provide a helpful response that addresses the user's question or concern.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 300,
            temperature: 0.7
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

    if (businessData.services && businessData.services.length > 0) {
        const serviceNames = businessData.services.map(s => s.name).join(', ');
        context += ` Services offered include: ${serviceNames}.`;
    }

    if (businessData.businessPhoneNumber || businessData.phone) {
        context += ` Phone: ${businessData.businessPhoneNumber || businessData.phone}.`;
    }

    if (businessData.operatingHours) {
        context += ` Operating hours: ${businessData.operatingHours}.`;
    }

    return context;
}; 