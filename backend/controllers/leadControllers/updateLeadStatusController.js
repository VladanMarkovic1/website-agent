import Lead from "../../models/Lead.js";

/**
 * Express route handler for updating the status of a lead.
 */
export const updateLeadStatus = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.status = status;
        lead.interactions.push({ type: 'Status Update', content: `Status changed to ${status}`, timestamp: new Date() });
        await lead.save();

        res.status(200).json(lead);
    } catch (error) {
        console.error("Error updating lead status:", error);
        res.status(500).json({ error: 'Failed to update lead status' });
    }
}; 