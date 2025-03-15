import express from "express";
import { handleChatMessage } from "../chatbotControllers/chatbotController.js";

const router = express.Router();

// ✅ Endpoint for chatbot responses
router.post("/message", handleChatMessage);

export default router;
