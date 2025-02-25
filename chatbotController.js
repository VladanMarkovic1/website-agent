import OpenAI from "openai";
import Service from "../models/Service.js";
import ExtraInfo from "../models/ExtraInfo.js";
import Contact from "../models/Contact.js";
import Business from "../models/Business.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Fetch services, FAQs, and contact details for the chatbot
 * Prioritizes manually updated data over scraped data
 */
export const getBusinessDataForChatbot = async (businessId) => {
    try {
        console.log(`🤖 Fetching chatbot data for business: ${businessId}`);

        // Fetch Business Name
        const business = await Business.findOne({ businessId }).lean();
        const businessName = business?.businessName || "our clinic";

        // Fetch manually overridden services first
        const serviceData = await Service.findOne({ businessId }).lean();
        const services = serviceData?.services || [];

        // Fetch FAQs
        const extraInfoData = await ExtraInfo.findOne({ businessId }).lean();
        const faqs = extraInfoData?.faqs || [];

        // Fetch contact details
        const contactData = await Contact.findOne({ businessId }).lean();
        const contactDetails = contactData || {};

        console.log(`✅ Chatbot Data Fetched: Services: ${services.length}, FAQs: ${faqs.length}, Contact: ${Object.keys(contactDetails).length}`);

        return { businessName, services, faqs, contactDetails };

    } catch (error) {
        console.error("❌ Error fetching chatbot data:", error);
        return null;
    }
};

/**
 * Handle incoming chatbot messages with sales-driven responses
 */
export const handleChatMessage = async (message, businessId) => {
    try {
        console.log(`💬 Processing chat message: "${message}" for business ${businessId}`);

        // Fetch business data
        const businessData = await getBusinessDataForChatbot(businessId);
        if (!businessData) return "⚠️ Sorry, I couldn't fetch business details at the moment.";

        const { businessName, services, faqs, contactDetails } = businessData;

        // Ensure services list is available
        const serviceNames = services.map(service => service.name);
        const serviceList = serviceNames.length > 0 ? serviceNames.join(", ") : "various high-quality dental services.";

        // **Detect High-Intent Users**
        const highIntentKeywords = ["price", "cost", "how much", "book", "appointment", "available", "consultation", "urgent", "need now"];
        const isHighIntent = highIntentKeywords.some(keyword => message.toLowerCase().includes(keyword));

        // **Generate AI Response**
        const prompt = `
        You are a **sales-driven AI chatbot** representing **${businessName}**, a leading dental clinic.
        Your goal is to **convert users into booked consultations** by providing persuasive and sales-focused responses.

        **Key Tactics:**
        - Answer like a **real human** who cares about the user.
        - **Personalize** responses with the user's name.
        - Always mention the **business name** in responses.
        - Use **urgency** (limited slots, special discounts, expert team).
        - Ensure every response has a **Call-To-Action (CTA)**.
        - Push users toward **booking an appointment**.

        **Example Scenarios:**
        - If they ask about services, list them but **encourage booking**.
        - If they ask about prices, ask for their **budget and urgency**.
        - If they seem ready, push for **immediate booking**.

        **User Message:** "${message}"
        **Business Services:** ${serviceList}
        **Contact Details:** Phone: ${contactDetails.phone || "Not available"}, Email: ${contactDetails.email || "Not available"}

        **🔥 High-Intent Handling:** ${
            isHighIntent
                ? "This user is showing strong interest! Offer them an immediate booking option or special deal."
                : "This user seems to be browsing. Engage them and encourage action."
        }

        Provide a response that **sells effectively and includes a Call-To-Action (CTA)**.
        `;

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7,
        });

        const finalResponse = aiResponse.choices[0]?.message?.content.trim() || "⚠️ I'm sorry, but I couldn't generate a response.";

        return finalResponse;
    } catch (error) {
        console.error("❌ Error handling chat message:", error);
        return "⚠️ Sorry, there was an error processing your request.";
    }
};
