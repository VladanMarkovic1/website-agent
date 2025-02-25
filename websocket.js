import { handleChatMessage } from "../controllers/chatbotController.js";

const initWebSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("✅ A user connected");

        socket.on("chatMessage", async ({ message, businessId }) => {
            console.log(`🔹 Received message: "${message}" for business ${businessId}`);

            const response = await handleChatMessage(message, businessId);
            socket.emit("chatResponse", { response });
        });

        socket.on("disconnect", () => {
            console.log("❌ A user disconnected");
        });
    });
};

export default initWebSocket;
