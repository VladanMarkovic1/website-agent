import { processWebSocketMessage } from "../controllers/chatbotControllers/chatbotController.js";
import Business from '../models/Business.js'; // Import Business model

const initWebSocket = (io) => {

    // --- WebSocket Authentication Middleware ---
    io.use(async (socket, next) => {
        const apiKey = socket.handshake.query.apiKey;
        const businessId = socket.handshake.query.businessId;

        // console.log(`[WebSocket Auth] Attempting connection for business: ${businessId}`);

        if (!apiKey || !businessId) {
            console.warn(`[WebSocket Auth] Failed: Missing apiKey or businessId in query for business: ${businessId || 'Unknown'}`);
            return next(new Error('Authentication error: Missing credentials'));
        }

        try {
            const business = await Business.findOne({ businessId }).select('+apiKeyHash');

            if (!business) {
                console.warn(`[WebSocket Auth] Failed: Business not found: ${businessId}`);
                return next(new Error('Authentication error: Invalid business'));
            }

            if (!business.apiKeyHash) {
                console.warn(`[WebSocket Auth] Failed: API Key not configured for business: ${businessId}`);
                return next(new Error('Authentication error: API Key not configured'));
            }

            const isValid = await business.compareApiKey(apiKey);

            if (!isValid) {
                console.warn(`[WebSocket Auth] Failed: Invalid API Key for business: ${businessId}`);
                return next(new Error('Authentication error: Invalid API Key'));
            }

            // console.log(`[WebSocket Auth] Success: Valid API Key for business: ${businessId}`);
            // Attach validated info to socket for potential later use?
            socket.businessId = businessId;
            socket.sessionId = socket.handshake.query.sessionId;
            next(); // Allow connection

        } catch (error) {
            console.error(`[WebSocket Auth] Internal Server Error during auth for ${businessId}:`, error);
            next(new Error('Authentication error: Server error'));
        }
    });
    // --- End WebSocket Authentication Middleware ---

    io.on("connection", (socket) => {
        // Now connection is only established if auth passed
        // console.log(`✅ User connected (Authenticated): Business ID: ${socket.businessId}, Session ID: ${socket.sessionId}`);
        
        // Send initial greeting message upon connection
        socket.emit("message", {
            type: "GREETING", // Use a consistent type
            response: "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?"
        });
        
        socket.on("message", async (data) => {
            // Use businessId/sessionId attached to the authenticated socket
            // console.log(`🔹 Received message: "${data.message}" for business ${socket.businessId}`);

            try {
                const response = await processWebSocketMessage(
                    data.message,
                    socket.sessionId, // Use ID from authenticated socket
                    socket.businessId  // Use ID from authenticated socket
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
            // console.log("❌ A user disconnected");
        });
    });
};

export default initWebSocket;
