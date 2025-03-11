import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateAIResponse = async (message, businessData) => {
    try {
        const prompt = `
        You are an AI chatbot for ${businessData.businessName}, a company that offers the following services: 
        ${businessData.services.map(service => service.name).join(", ")}. 
        Your goal is to convert users into customers by guiding them to book an appointment or contact the business.

        The user asks: "${message}"

        Provide a **sales-driven** response. If relevant, ask if they want to book a consultation or provide their contact details.
        If they ask for prices, mention them if available. If not, encourage them to reach out for a quote.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content.trim();
    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        return "Sorry, I couldn't process your request at the moment.";
    }
};
