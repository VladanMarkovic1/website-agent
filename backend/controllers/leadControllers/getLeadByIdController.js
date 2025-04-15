import Lead from "../../models/Lead.js";

/**
 * Express route handler for fetching a lead by its ID.
 */
export const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.status(200).json(lead);
    } catch (error) {
        console.error("Error fetching lead by ID:", error);
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
}; 