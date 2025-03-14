import express from "express";
import { getLeads, saveLead, updateLeadStatus } from "../controllers/leadController.js";

const router = express.Router();

// Routes for leads
router.get("/:businessId", getLeads);
router.post("/", saveLead);
router.put("/:leadId", updateLeadStatus);

export default router;
