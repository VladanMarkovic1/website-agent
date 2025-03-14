import express from "express";
import { sendFollowUpEmail } from "../controllers/emailController.js";

const router = express.Router();

// Route to send follow-up emails
router.post("/send-followup", sendFollowUpEmail);

export default router;
