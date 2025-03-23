import express from "express";
import { getLeads, createLeadHandler, updateLeadStatusHandler } from "../controllers/leadController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";

const router = express.Router();

// GET /leads/:businessId - Retrieve all leads for a specific business
router.get("/:businessId", authenticateToken, checkBusinessOwner, getLeads);

// POST /leads - Create a new lead
// If lead creation should be public (e.g., from a chatbot), you might leave this unprotected.
// But if you want only authenticated users to create leads, secure it too:
router.post("/", authenticateToken, createLeadHandler);

// PUT /leads/:leadId - Update the status of a lead
// This one should be secured so that only authorized users can update lead status.
router.put("/:leadId", authenticateToken, updateLeadStatusHandler);

export default router;
