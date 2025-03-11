import express from "express";
import { getBusinessDataForChatbot } from "../controllers/chatbotController.js";

const router = express.Router();

// ✅ Endpoint for chatbot responses
router.post("/message", getBusinessDataForChatbot);

export default router;
