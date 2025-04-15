import OpenAI from "openai";
import dotenv from "dotenv";
import {
    CHATBOT_PERSONALITY,
    RESPONSE_TEMPLATES
} from "./chatbotConstants.js"; // Import necessary constants

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates a response using the OpenAI API as a fallback.
 * 
 * @param {string} message - The user's current message.
 * @param {Array} messageHistory - The conversation history.
 * @returns {Promise<Object>} An object containing the type ('AI_FALLBACK' or 'ERROR_FALLBACK') and the response string.
 */
export const generateAIFallbackResponse = async (message, messageHistory) => {
    console.log('Falling back to OpenAI generation.');
    const systemPrompt = `You are a dental office AI assistant.
Persona Traits: ${CHATBOT_PERSONALITY.traits.join(', ')}.
Rules: ${CHATBOT_PERSONALITY.rules.join(' ')} Your primary goal is to either answer basic service questions or collect contact information to schedule a consultation. If you need to collect contact information, you MUST explicitly ask for the user's full name, phone number, AND email address. Do not ask for generic 'contact details' or 'preferred contact'. Acknowledge the user's statement, explain that a dentist needs to evaluate specific conditions, and offer to help schedule an appointment by collecting these three pieces of information. Do not give medical advice. Keep responses concise,friendly and always use emojis.`;

    const conversationHistory = messageHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4), // Include last 4 messages for context
        { role: "user", content: message }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 100,
        });

        const aiResponseContent = completion.choices[0]?.message?.content?.trim() || RESPONSE_TEMPLATES.understanding;
        console.log('OpenAI generated response:', aiResponseContent);

        return {
            type: 'AI_FALLBACK',
            response: aiResponseContent
        };

    } catch (openaiError) {
        console.error("OpenAI API call failed:", openaiError);
        return {
            type: 'ERROR_FALLBACK',
            response: RESPONSE_TEMPLATES.understanding // Use standard understanding template
        };
    }
}; 