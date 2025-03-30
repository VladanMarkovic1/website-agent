import express from "express";
import { handleChatMessage } from "../controllers/chatbotControllers/chatbotController.js";

const router = express.Router();

// ✅ Endpoint for chatbot responses
router.post("/message", async (req, res) => {
    try {
        const { message } = req.body;
        const businessId = req.query.businessId || "default";
        const response = await handleChatMessage(message, businessId);
        res.json(response);
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
