import Lead from "../../models/Lead.js";

/**
 * Express route handler for creating a new lead. (Potentially unused, verify usage)
 */
export const createLeadHandler = async (req, res) => {
    try {
        const { name, email, phone, message, businessId, status } = req.body;

        if (!name || !email || !phone || !businessId) {
            return res.status(400).json({ error: 'Name, email, phone, and businessId are required' });
        }

        const newLead = new Lead({
            name,
            email,
            phone,
            message: message || '',
            businessId,
            status: status || 'New',
            createdAt: new Date(),
            interactions: []
        });

        await newLead.save();
        res.status(201).json(newLead);
    } catch (error) {
        console.error("Error creating lead:", error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
}; 