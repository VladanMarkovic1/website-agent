import { saveLead } from "./leadController.js";

/**
 * Express route handler for creating a lead via a direct API call.
 * Expects businessId in URL params, and name, phone, email (optional), 
 * message (optional), and serviceInterest (optional) in req.body.
 */
export const createLeadHandler = async (req, res) => {
    try {
        // Get businessId from URL parameters, other data from body
        const { businessId } = req.params;
        const { name, phone, email, message, serviceInterest } = req.body; // Get all potential fields

        if (!businessId) {
            return res.status(400).json({ error: "Business ID missing in URL parameter" });
        }
        
        // Basic validation for required fields needed by saveLead
        if (!name || !phone) {
            return res.status(400).json({ error: "Missing required fields: name and phone" });
        }

        // Construct the context object for saveLead
        // Note: saveLead expects problemDescription and messageHistory, 
        // we adapt the direct API call data to fit that structure.
        const leadContext = { 
            businessId, 
            name, 
            phone, 
            email, // Pass email if available
            serviceInterest, 
            problemDescription: message || "Lead submitted via API", // Use message or fallback
            messageHistory: message ? [{ role: 'user', content: message }] : [] // Provide minimal history if message exists
        };

        const responseMessage = await saveLead(leadContext);
        
        res.status(201).json({ success: true, message: responseMessage }); // Use 201 Created for new resource

    } catch (error) {
        console.error("Error in createLeadHandler:", error);
        // Check if the error came from saveLead's validation or business not found
        if (error.message?.includes("Missing required contact") || error.message?.includes("Business not found") || error.message?.includes("Lead validation failed")) {
             res.status(400).json({ error: error.message });
        } else {
            // Generic server error
            res.status(500).json({ 
                error: "Internal server error while creating lead." 
            });
        }
    }
}; 