import express from "express";
import { getLeads, createLeadHandler, updateLeadStatusHandler } from "../controllers/leadControllers/leadController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";
import Lead from "../models/Lead.js";

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
router.post("/:businessId/notes/:leadId", authenticateToken, checkBusinessOwner, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { note } = req.body;
    const business = req.business;

    console.log('Adding note:', {
      leadId,
      businessId: business._id,
      note,
      body: req.body
    });

    if (!note) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const lead = await Lead.findOne({ _id: leadId, businessId: business._id });
    console.log('Found lead:', lead ? 'yes' : 'no');
    
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Add the note to call history
    lead.callHistory.push({
      timestamp: new Date(),
      notes: note
    });

    await lead.save();
    console.log('Note added successfully');
    res.status(200).json(lead);
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ error: "Failed to add note: " + error.message });
  }
});

export default router;
