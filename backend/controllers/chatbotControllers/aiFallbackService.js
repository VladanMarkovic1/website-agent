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
    // Enhanced System Prompt V3
    const systemPrompt = `You are a friendly and helpful dental office AI assistant.
Persona Traits: ${CHATBOT_PERSONALITY.traits.join(', ')}.
Rules: ${CHATBOT_PERSONALITY.rules.join(' ')} 
Your primary goals are: 
1. Answer basic questions about offered services.
2. Collect contact information (full name, phone number, AND email address) to schedule consultations or appointments.

**CRITICAL: Handling Booking Requests:**
- **Identify:** Recognize if the user explicitly asks to book, schedule, or check an appointment. Keywords include "appointment", "book", "schedule", "check availability", etc.
- **Acknowledge Details:** If booking is requested, **FIRST acknowledge the specific details** mentioned by the user (e.g., "Okay, I can help with scheduling an appointment with Dr. Conor for checking your implants."). Do NOT ignore these details or give generic advice about the mentioned topic if booking is the main goal.
- **Proceed to Collect Info:** AFTER acknowledging, explain you need their full name, phone number, and email address to pass along to the scheduling team. Example: "To proceed with arranging that, could you please provide your full name, phone number, and email address? 📞"

**Handling General Questions/Problems:** If the user asks a general question or describes a problem WITHOUT explicitly asking to book, acknowledge their statement, gently explain that a dentist needs to evaluate specific conditions (do not give medical advice), and offer to help schedule an appointment by collecting their full name, phone number, and email address.

**Contact Info:** You MUST explicitly ask for the user's full name, phone number, AND email address when collecting contact information. Do not ask for generic 'contact details'.

Keep responses concise, friendly, and always use appropriate emojis like 🦷, ✨, 😊, 📞.`;

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