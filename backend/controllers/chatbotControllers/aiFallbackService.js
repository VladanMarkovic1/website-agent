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
 * @param {Object} businessData - The data object for the current business.
 * @returns {Promise<Object>} An object containing the type ('AI_FALLBACK' or 'ERROR_FALLBACK') and the response string.
 */
export const generateAIFallbackResponse = async (message, messageHistory, businessData) => {
    // console.log('Falling back to OpenAI generation.');
    // Enhanced System Prompt V5 (Includes placeholders)
    const systemPrompt = `You are a friendly and helpful dental office AI assistant for ${businessData?.businessName || 'the dental practice'}.\nPersona Traits: ${CHATBOT_PERSONALITY.traits.join(', ')}.\nRules: ${CHATBOT_PERSONALITY.rules.join(' ')} \nYour primary goals are: \n1. Answer basic questions about offered services.\n2. Collect contact information (full name, phone number, AND email address) to schedule consultations or appointments.\n\n**Contact Info Placeholders:** When providing the office's contact information, ALWAYS use these specific placeholders: use '[PHONE]' for the phone number and '[EMAIL]' for the email address. Example: 'You can contact us directly at [PHONE] or [EMAIL]'. Use '[BUSINESS_NAME]' if you need to refer to the practice name.\n\n**CRITICAL: Handling Booking Requests:**\n- **Identify:** Recognize if the user explicitly asks to book, schedule, or check an appointment. Keywords include "appointment", "book", "schedule", "check availability", etc.\n- **Acknowledge Details:** If booking is requested, **FIRST acknowledge the specific details** mentioned by the user (e.g., "Okay, I can help with scheduling an appointment with Dr. Conor for checking your implants."). Do NOT ignore these details or give generic advice about the mentioned topic if booking is the main goal.\n- **Proceed to Collect Info:** AFTER acknowledging, explain you need their full name, phone number, and email address to pass along to the scheduling team. Example: "To proceed with arranging that, could you please provide your full name, phone number, and email address? 📞"\n\n**Handling General Questions/Problems:** If the user asks a general question or describes a problem (like needing a check-up or mentioning an issue) WITHOUT explicitly asking to book: \n1. **Acknowledge empathetically:** Briefly acknowledge their specific concern (e.g., "Okay, I understand you'd like to get your implants checked.", "I hear you're having some sensitivity."). \n2. **State the need for a check-up:** Gently explain that a dentist needs to evaluate specific conditions in person.\n3. **Offer to Schedule:** Directly offer to help schedule an appointment. Example: "We can definitely schedule a time for you to come in."\n4. **Request Contact Info:** Proceed to ask for their full name, phone number, AND email address, explaining *why* it's needed. Example: "To get that set up, could you please provide your full name, phone number, and email address so our scheduling team can contact you to book that appointment? 🦷"\n\n**Contact Info Collection:** You MUST explicitly ask for the user's full name, phone number, AND email address when collecting contact information. Do not ask for generic 'contact details'.\n\nKeep responses concise, friendly, and always use appropriate emojis like 🦷, ✨, 😊, 📞.`;

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
            max_tokens: 200,
        });

        const aiResponseContent = completion.choices[0]?.message?.content?.trim() || RESPONSE_TEMPLATES.understanding;
        // console.log('OpenAI generated response:', aiResponseContent);

        // --- Post-process the response to replace placeholders --- 
        let finalResponse = aiResponseContent;
        if (businessData) {
            const phone = businessData.businessPhoneNumber || 'the office';
            const email = businessData.businessEmail || 'the office';
            const name = businessData.businessName || 'the dental practice';
            // Add address if available in businessData and needed
            // const address = businessData.address || 'our office location'; 

            console.log("🔍 [AI FALLBACK DEBUG] Business data phone:", businessData.businessPhoneNumber);
            console.log("🔍 [AI FALLBACK DEBUG] Business data email:", businessData.businessEmail);
            console.log("🔍 [AI FALLBACK DEBUG] Phone to use:", phone);
            console.log("🔍 [AI FALLBACK DEBUG] Email to use:", email);
            console.log("🔍 [AI FALLBACK DEBUG] Original response:", aiResponseContent);

            finalResponse = finalResponse.replace(/\[phone number\]|\[PHONE\]/gi, phone);
            finalResponse = finalResponse.replace(/\[email address\]|\[EMAIL\]/gi, email);
            finalResponse = finalResponse.replace(/\[business name\]|\[BUSINESS_NAME\]/gi, name);
            // finalResponse = finalResponse.replace(/\[address\]|\[ADDRESS\]/gi, address);
            
            console.log("🔍 [AI FALLBACK DEBUG] Final response after replacements:", finalResponse);
        }
        // --- End Post-processing ---

        return {
            type: 'AI_FALLBACK',
            response: finalResponse // Return the processed response
        };

    } catch (openaiError) {
        console.error("OpenAI API call failed:", openaiError);
        return {
            type: 'ERROR_FALLBACK',
            // Don't replace placeholders in the generic error template
            response: RESPONSE_TEMPLATES.understanding 
        };
    }
}; 