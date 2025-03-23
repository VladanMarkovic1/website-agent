import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateAIResponse = async (message, businessData) => {
    try {
        // Craft a concise, sales-driven prompt
        const prompt = `
You are an AI chatbot for ${businessData.businessName}, which offers the following services:
${businessData.services.map(service => service.name).join(", ")}.

GOAL:
- Convert users into customers by guiding them to book an appointment or provide their contact details.

USER MESSAGE:
"${message}"

INSTRUCTIONS:
- Provide a short, warm, human-like response (2-3 sentences).
- Sound like a friendly, knowledgeable sales expert.
- If prices are available, mention them briefly; otherwise, encourage the user to reach out for details.
- End with a clear call to action (e.g., booking an appointment or requesting contact info).
- Keep it concise and persuasive.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7,
            max_tokens: 100, // Limits the length of the response
        });

        // Return the trimmed text from GPT
        return response.choices[0]?.message?.content.trim();
    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return "Sorry, I couldn't process your request at the moment.";
    }
};
