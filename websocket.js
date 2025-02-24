import { getChatbotResponse } from "../controllers/chatbotController.js";

const initWebSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("⚡ New client connected:", socket.id);

        socket.on("chatMessage", async (data) => {
            console.log("📩 Message received from client:", data);

            const { message, businessId } = data;
            if (!message || !businessId) {
                console.error("❌ Missing message or businessId");
                return;
            }

            const botResponse = await getChatbotResponse({ body: { message, businessId } }, { json: (response) => response });
            console.log("🤖 Chatbot response:", botResponse);

            socket.emit("chatResponse", botResponse);
        });

        socket.on("disconnect", () => {
            console.log("🔌 Client disconnected:", socket.id);
        });
    });
};

export default initWebSocket;
