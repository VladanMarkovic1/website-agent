import Lead from "../../models/Lead.js";

/**
 * Express route handler for fetching all leads for a given business ID.
 */
export const getLeads = async (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }
        const leads = await Lead.find({ businessId });
        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
}; 