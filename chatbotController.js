import Service from "../models/Service.js";
import ExtraInfo from "../models/ExtraInfo.js";
import Contact from "../models/Contact.js";

const activeSessions = new Map(); // Track user chat history

/**
 * Fetch services, FAQs, and contact details for the chatbot
 * Prioritizes manually updated data over scraped data
 */
export const getChatbotResponse = async (req, res) => {
    console.log("🔍 Incoming chatbot request:", req.body);

    const { message, businessId } = req.body;

    if (!message || !businessId) {
        console.error("❌ Missing required fields: message or businessId");
        return res.status(400).json({ error: "Message and businessId are required." });
    }

    console.log(`📩 Received message: "${message}" for business: ${businessId}`);

    let botResponse = "🤖 I’m here to assist. Can you clarify your question?";

    if (message.toLowerCase().includes("services")) {
        botResponse = "🛠️ We offer multiple services. Which one interests you?";
    } else if (message.toLowerCase().includes("price")) {
        botResponse = "💰 Our prices depend on the service. Can you specify which one?";
    } else if (message.toLowerCase().includes("contact")) {
        botResponse = "📞 You can contact us at +123456789 or email info@business.com";
    }

    console.log("✅ Responding with:", botResponse);
    return res.json({ response: botResponse });
};


/**
 * Handle incoming chat messages via WebSocket
 */
export const handleChatMessage = async (socket, message, businessId) => {
    const sessionId = socket.id;

    if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, []);
    }

    activeSessions.get(sessionId).push({ user: message });

    // Fetch business-specific chatbot data
    const businessData = await getBusinessDataForChatbot(businessId);
    if (!businessData) {
        socket.emit("bot_message", "❌ Sorry, I couldn't fetch business data right now.");
        return;
    }

    let botResponse = "🤖 I’m here to assist. Can you clarify your question?";

    if (message.toLowerCase().includes("services")) {
        botResponse = `🛠️ We offer the following services: ${businessData.services.map(s => s.name).join(", ")}. Which one are you interested in?`;
    } else if (message.toLowerCase().includes("price")) {
        botResponse = "💰 Our prices depend on the service. Can you specify which one?";
    } else if (message.toLowerCase().includes("appointment")) {
        botResponse = "📅 I can schedule an appointment for you. What date works best?";
    } else if (message.toLowerCase().includes("faq")) {
        botResponse = `❓ Here are some FAQs: ${businessData.faqs.map(f => f.question).join(", ")}. Need more details?`;
    } else if (message.toLowerCase().includes("contact")) {
        botResponse = `📞 You can reach us at ${businessData.contactDetails.phone || "Not available"} or email us at ${businessData.contactDetails.email || "Not available"}.`;
    }

    activeSessions.get(sessionId).push({ bot: botResponse });

    // Send bot response back
    socket.emit("bot_message", botResponse);
};
