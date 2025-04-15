import Lead from "../../models/Lead.js";

/**
 * Express route handler for adding an interaction to a lead.
 */
export const addLeadInteraction = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { type, content } = req.body;

        if (!type || !content) {
            return res.status(400).json({ error: 'Interaction type and content are required' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.interactions.push({ type, content, timestamp: new Date() });
        await lead.save();

        res.status(200).json(lead);
    } catch (error) {
        console.error("Error adding lead interaction:", error);
        res.status(500).json({ error: 'Failed to add lead interaction' });
    }
}; 