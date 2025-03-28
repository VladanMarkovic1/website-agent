import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import { sendInstantConfirmation } from "../emailControllers/emailService.js";

/**
 * Function to capture and store leads in MongoDB.
 * This is your core function that returns a response message.
 */

export const saveLead = async (businessId, message, serviceInterest = "General Inquiry") => {
    try {
        console.log(`📥 Processing lead capture for business: ${businessId}, Service Interest: ${serviceInterest}`);

        // First find the business by the string businessId
        const business = await Business.findOne({ businessId: businessId });
        if (!business) {
            console.error("❌ Error: Business not found");
            return "⚠️ Error: Invalid business ID.";
        }

        // Use business._id for all database operations
        const actualBusinessId = business._id;

        // Ensure message is valid before processing
        if (!message || typeof message !== "string") {
            console.error("❌ Error: Invalid message format.");
            return "⚠️ Error: Invalid message format.";
        }

        // Extract name, phone, and email from the message
        const parts = message.split(/[,:]/).map(part => part.trim());
        let name, phone, email;

        // Try to find each piece of information using labels
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].toLowerCase();
            const value = parts[i + 1]?.trim();

            if (part.includes('name') && value) {
                name = value;
                i++;
            } else if (part.includes('phone') && value) {
                phone = value;
                i++;
            } else if (part.includes('email') && value) {
                email = value;
                i++;
            }
        }

        // If not all information was found, try to extract directly
        if (!name || !phone || !email) {
            const emailMatch = message.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            const phoneMatch = message.match(/\b\d[\d\s-]{5,}\d\b/);
            
            if (emailMatch) email = emailMatch[0];
            if (phoneMatch) phone = phoneMatch[0];
            
            // Use remaining parts as potential name
            const remainingParts = parts.filter(part => {
                const isEmail = part.includes('@');
                const isPhone = part.replace(/\D/g, '').length >= 6;
                const isLabel = part.toLowerCase().includes('name') ||
                                part.toLowerCase().includes('phone') ||
                                part.toLowerCase().includes('email');
                return !isEmail && !isPhone && !isLabel;
            });
            
            if (!name && remainingParts.length > 0) {
                name = remainingParts[0];
            }
        }

        // Validate that required information is available
        if (!name || !phone) {
            console.log("⚠️ Missing required contact information");
            console.log("Name:", name);
            console.log("Phone:", phone);
            return null;
        }

        // Check if lead already exists using actualBusinessId
        const existingLead = await Lead.findOne({ businessId: actualBusinessId, phone });
        if (existingLead) {
            console.log(`⚠️ Lead already exists: ${name} - ${phone}`);
            return `📞 Thanks, ${name}! We already have your details and will contact you soon.`;
        }

        // Save new lead with priority status based on time
        const currentHour = new Date().getHours();
        const isPriorityHours = currentHour >= 9 && currentHour < 17; // 9 AM to 5 PM

        const newLead = new Lead({
            businessId: actualBusinessId, // Use the ObjectId instead of string businessId
            name,
            phone,
            email: email || null, // Make email optional
            service: serviceInterest,
            status: "new",
            priority: isPriorityHours ? "high" : "normal",
            bestTimeToCall: isPriorityHours ? "now" : "next-business-day",
            createdAt: new Date(),
            lastContactedAt: new Date()
        });

        await newLead.save();

        // Send confirmation email if email is provided
        if (email) {
            sendInstantConfirmation({
                name,
                phone,
                email,
                service: serviceInterest
            }).catch(error => {
                console.error('Error sending confirmation email:', error);
            });
        }

        // Return appropriate message based on business hours
        const responseMessage = isPriorityHours
            ? `✅ Thank you, ${name}! Our team will call you very shortly at ${phone} to discuss ${serviceInterest}.${email ? ' We\'ve also sent you a confirmation email.' : ''}`
            : `✅ Thank you, ${name}! Our team will call you during business hours (9 AM - 5 PM) at ${phone} to discuss ${serviceInterest}.${email ? ' We\'ve also sent you a confirmation email.' : ''}`;

        console.log(`✅ New lead captured: ${name} - ${phone}`);
        return responseMessage;

    } catch (error) {
        console.error("❌ Error saving lead:", error);
        return "⚠️ Sorry, there was an error processing your request.";
    }
};

/**
 * Express route handler for creating a lead.
 * Expects businessId, message, and optionally serviceInterest in req.body.
 */
export const createLeadHandler = async (req, res) => {
    try {
        const { businessId, message, serviceInterest } = req.body;
        const responseMessage = await saveLead(businessId, message, serviceInterest);
        if (!responseMessage) {
            return res.status(400).json({ error: "Missing required contact information or lead already exists." });
        }
        res.status(200).json({ success: true, message: responseMessage });
    } catch (error) {
        console.error("Error creating lead:", error);
        res.status(500).json({ error: "Internal server error while creating lead." });
    }
};

/**
 * Express route handler for retrieving leads for a specific business.
 * Expects businessId in req.params.
 */
export const getLeads = async (req, res) => {
    try {
        // Use the business object that was attached by checkBusinessOwner middleware
        const business = req.business;
        
        if (!business) {
            return res.status(404).json({ error: "Business not found." });
        }

        // Fetch leads using business._id
        const leads = await Lead.find({ businessId: business._id }).sort({ createdAt: -1 });
        console.log(`Found ${leads.length} leads for business ${business.businessId}`);
        res.status(200).json(leads);
    } catch (error) {
        console.error("❌ Error fetching leads:", error);
        res.status(500).json({ error: "Internal server error while retrieving leads." });
    }
};

/**
 * Express route handler for updating lead status.
 * Expects leadId in req.params and status in req.body.
 */
export const updateLeadStatusHandler = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "Status is required." });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: "Lead not found." });
        }

        // Update status and add to call history
        lead.status = status;
        lead.lastContactedAt = new Date();
        lead.callHistory.push({
            status,
            notes: `Status updated to ${status}`,
            timestamp: new Date()
        });

        await lead.save();
        res.status(200).json(lead);
    } catch (error) {
        console.error("Error updating lead status:", error);
        res.status(500).json({ error: "Internal server error while updating lead status." });
    }
};

/**
 * Express route handler for adding notes to a lead.
 * Expects leadId in req.params and note in req.body.
 */
export const addLeadNoteHandler = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { note } = req.body;

        if (!note) {
            return res.status(400).json({ error: "Note content is required." });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: "Lead not found." });
        }

        // Add note to call history
        lead.callHistory.push({
            notes: note,
            timestamp: new Date()
        });

        await lead.save();
        res.status(200).json(lead);
    } catch (error) {
        console.error("Error adding lead note:", error);
        res.status(500).json({ error: "Internal server error while adding note." });
    }
};
