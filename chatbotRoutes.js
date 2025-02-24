import express from "express";
import { getChatbotResponse } from "../controllers/chatbotController.js";

const router = express.Router();

// ✅ Endpoint for chatbot responses
router.post("/message", getChatbotResponse);

export default router;
