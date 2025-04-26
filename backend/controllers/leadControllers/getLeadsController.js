import Lead from "../../models/Lead.js";
import { decrypt } from "../../utils/encryption.js"; // Import decrypt utility

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

        // console.log(`✅ Found ${count} leads for business ${businessId}`); // REMOVED

        // --- Log the top sorted leads for verification --- // REMOVED Block
        // if (leads && leads.length > 0) {
        //     console.log("Top 3 sorted leads (ID, LastContacted):");
        //     leads.slice(0, 3).forEach(lead => {
        //         console.log(`  - ID: ${lead._id}, LastContactedAt: ${lead.lastContactedAt}`);
        //     });
        // }
        // --- End logging ---

        // Decrypt sensitive fields before sending to frontend
        const decryptedLeads = leads.map(lead => {
            const decryptedLead = { ...lead }; // Clone the lead object
            try {
                if (lead.name && lead.nameIv) {
                    decryptedLead.name = decrypt(lead.name, lead.nameIv);
                } else {
                    decryptedLead.name = lead.name; // Keep original if decryption not possible/needed
                }
                if (lead.phone && lead.phoneIv) {
                    decryptedLead.phone = decrypt(lead.phone, lead.phoneIv);
                } else {
                    decryptedLead.phone = lead.phone;
                }
                if (lead.email && lead.emailIv) {
                    decryptedLead.email = decrypt(lead.email, lead.emailIv);
                } else {
                    decryptedLead.email = lead.email; // Keep original (might be null or unencrypted)
                }
            } catch (decryptionError) {
                console.error(`Error decrypting lead ${lead._id}:`, decryptionError);
                // Keep encrypted data or set to placeholder on error
                // For safety, perhaps set to null or an error indicator
                decryptedLead.name = lead.name; // Fallback to original (encrypted) on error
                decryptedLead.phone = lead.phone;
                decryptedLead.email = lead.email;
            }
            return decryptedLead;
        });

        // Return in the format expected by the frontend hook
        res.status(200).json({
            success: true,
            count: count, // Use the original count
            leads: decryptedLeads // Send the decrypted leads
        });

    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch leads' });
    }
}; 