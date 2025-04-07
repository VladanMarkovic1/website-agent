import express from "express";
import { handleChatMessage } from "../controllers/chatbotControllers/chatbotController.js";

const router = express.Router();

// ✅ Endpoint for chatbot responses
router.post("/message", async (req, res) => {
    try {
        // Pass the entire req and res objects to the controller
        await handleChatMessage(req, res);
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
