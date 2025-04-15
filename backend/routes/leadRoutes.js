import express from "express";
import { getLeads } from '../controllers/leadControllers/getLeadsController.js';
import { createLeadHandler } from '../controllers/leadControllers/createLeadController.js';
import { updateLeadStatus } from '../controllers/leadControllers/updateLeadStatusController.js';
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
import { addNoteForLeadController } from "../controllers/leadControllers/addNoteForLeadController.js";
import { removeNoteFromLeadController } from "../controllers/leadControllers/removeNoteFromLeadController.js";

const router = express.Router();

// GET /leads/:businessId - Retrieve all leads for a specific business
router.get("/:businessId", authenticateToken, checkBusinessOwner, getLeads);

// POST /leads - Create a new lead
router.post("/", authenticateToken, createLeadHandler);

// PUT /leads/:businessId/:leadId - Update the status of a lead
router.put("/:businessId/:leadId", authenticateToken, checkBusinessOwner, updateLeadStatus);

// POST /leads/:businessId/notes/:leadId - Add a note to a lead
router.post("/:businessId/notes/:leadId", authenticateToken, checkBusinessOwner, addNoteForLeadController);

// DELETE /leads/:businessId/notes/:leadId/:noteId - Remove a note from a lead
router.delete("/:businessId/notes/:leadId/:noteId", authenticateToken, checkBusinessOwner, removeNoteFromLeadController);

export default router;
