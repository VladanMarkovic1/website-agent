import express from "express";
import { getLeads, createLeadHandler, updateLeadStatusHandler } from "../controllers/leadControllers/leadController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
import { addNoteForLeadController } from "../controllers/leadControllers/addNoteForLeadController.js";

const router = express.Router();

// GET /leads/:businessId - Retrieve all leads for a specific business
router.get("/:businessId", authenticateToken, checkBusinessOwner, getLeads);

// POST /leads - Create a new lead
// If lead creation should be public (e.g., from a chatbot), you might leave this unprotected.
// But if you want only authenticated users to create leads, secure it too:
router.post("/", authenticateToken, createLeadHandler);

// PUT /leads/:businessId/:leadId - Update the status of a lead
// This one should be secured so that only authorized users can update lead status.
router.put("/:businessId/:leadId", authenticateToken, checkBusinessOwner, updateLeadStatusHandler);

// POST /leads/:businessId/notes/:leadId - Add a note to a lead
router.post("/:businessId/notes/:leadId", authenticateToken, checkBusinessOwner, addNoteForLeadController);

export default router;
