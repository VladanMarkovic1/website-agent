import Lead from "../../models/Lead.js";

/**
 * Express route handler for fetching all leads for a given business ID from URL params.
 */
export const getLeads = async (req, res) => {
    try {
        // Correctly get businessId from URL parameters
        const { businessId } = req.params; 

        if (!businessId) {
            // This check might be redundant if the route enforces the param, but good practice
            return res.status(400).json({ success: false, error: 'Business ID is required in URL path' }); 
        }

        // Fetch leads and count them
        const leads = await Lead.find({ businessId })
                              .sort({ lastContactedAt: -1 })
                              .lean(); // Use lean for performance
        const count = leads.length;

        console.log(`✅ Found ${count} leads for business ${businessId}`);

        // --- Log the top sorted leads for verification ---
        if (leads && leads.length > 0) {
            console.log("Top 3 sorted leads (ID, LastContacted):");
            leads.slice(0, 3).forEach(lead => {
                console.log(`  - ID: ${lead._id}, LastContactedAt: ${lead.lastContactedAt}`);
            });
        }
        // --- End logging ---

        // Return in the format expected by the frontend hook
        res.status(200).json({
            success: true,
            count: count,
            leads: leads
        });

    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch leads' });
    }
}; 