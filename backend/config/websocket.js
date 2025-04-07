import { processWebSocketMessage } from "../controllers/chatbotControllers/chatbotController.js";

const initWebSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("✅ A user connected");
        const { businessId, sessionId } = socket.handshake.query;
        console.log(`Business ID: ${businessId}, Session ID: ${sessionId}`);

        socket.on("message", async (data) => {
            console.log(`🔹 Received message: "${data.message}" for business ${data.businessId}`);

            try {
                const response = await processWebSocketMessage(
                    data.message,
                    sessionId,
                    data.businessId
                );
                
                socket.emit("message", response);
            } catch (error) {
                console.error("Error handling message:", error);
                socket.emit("message", {
                    type: "error",
                    response: "Sorry, there was an error processing your message."
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("❌ A user disconnected");
        });
    });
};

export default initWebSocket;
