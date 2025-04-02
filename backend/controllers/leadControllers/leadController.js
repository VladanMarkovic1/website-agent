import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import { sendInstantConfirmation } from "../emailControllers/emailService.js";

/**
 * Function to capture and store leads in MongoDB.
 * This is your core function that returns a response message.
 */

// Helper function to extract contact information from message
const extractContactInfo = (message) => {
    // Try to find each piece of information using labels
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

    return { name, phone, email };
};

// Helper functions
const extractUserConcern = (messageHistory) => {
    if (!messageHistory || messageHistory.length === 0) return null;
    
    // Find first non-greeting user message that indicates a dental concern
    const concernMessage = messageHistory
        .filter(msg => msg.isUser && 
            !msg.message.toLowerCase().includes('hello') && 
            !msg.message.toLowerCase().includes('hi'))
        .map(msg => msg.message)
        .find(msg => msg);

    // Check for emergency keywords
    const emergencyKeywords = ['broken', 'pain', 'bleeding', 'swelling', 'accident', 'emergency'];
    const isEmergency = emergencyKeywords.some(keyword => 
        concernMessage?.toLowerCase().includes(keyword)
    );

    return {
        message: concernMessage || null,
        isEmergency
    };
};

const formatLeadContext = (initialMessage, detectedService, messageHistory) => {
    const userConcern = extractUserConcern(messageHistory);
    
    // Create a more empathetic response based on the concern
    let formattedReason = "";
    if (userConcern?.isEmergency) {
        formattedReason = `URGENT DENTAL CARE NEEDED - Patient reported: ${userConcern.message}\n` +
            `This appears to be a dental emergency requiring immediate attention.\n` +
            `Service Category: ${detectedService || 'Emergency Dental Care'}\n` +
            `Priority: Immediate follow-up recommended`;
    } else {
        formattedReason = userConcern?.message ? 
            `Patient's Concern: ${userConcern.message}\n` +
            `Service Interest: ${detectedService || 'General Dental Care'}` : 
            "General inquiry about dental services";
    }

    return {
        initialMessage: userConcern?.message || initialMessage || "No initial message",
        reason: formattedReason
    };
};

export const saveLead = async (businessId, contactInfo, serviceInterest, context = {}) => {
    try {
        console.log("🔍 Finding business:", { businessId });
        const business = await Business.findOne({ businessId });
        
        if (!business) {
            console.error("❌ Business not found:", businessId);
            return "I apologize, but I'm having trouble connecting to our system. Please call our office directly for immediate assistance.";
        }

        // Parse contact info
        const { name, phone, email } = typeof contactInfo === 'string' ? 
            extractContactInfo(contactInfo) : contactInfo;

        if (!name || !phone || !email) {
            const missingFields = [];
            if (!name) missingFields.push("name");
            if (!phone) missingFields.push("phone number");
            if (!email) missingFields.push("email");
            
            return `I understand this is concerning, and I want to help you right away. Could you please provide your ${missingFields.join(", ")} so our dental team can contact you as soon as possible?`;
        }

        // Format context properly
        const formattedContext = {
            initialMessage: context.initialMessage || "No initial message provided",
            reason: context.reason || `Interest in: ${serviceInterest || 'General Inquiry'}`
        };

        // Check for existing lead
        const existingLead = await Lead.findOne({
            businessId: business.businessId,
            $or: [{ email }, { phone }]
        });

        if (existingLead) {
            console.log("📝 Updating existing lead:", existingLead._id);
            
            existingLead.name = name;
            existingLead.phone = phone;
            existingLead.email = email;
            existingLead.service = serviceInterest || existingLead.service;
            existingLead.reason = formattedContext.reason;
            existingLead.lastContact = new Date();
            existingLead.contactCount += 1;
            
            await existingLead.save();
            
            return `Thank you, ${name}. I've updated your information and marked this as urgent. Our dental team will contact you very soon to address your dental emergency. If you need immediate assistance, please don't hesitate to call our office directly.`;
        }

        // Create new lead with required fields
        const lead = new Lead({
            businessId: business.businessId,
            name,
            phone,
            email,
            service: serviceInterest || 'Emergency Dental Care',
            reason: formattedContext.reason,
            source: 'chatbot',
            status: 'new',
            lastContact: new Date(),
            contactCount: 1,
            context: formattedContext
        });

        console.log("Creating new lead with data:", {
            businessId: lead.businessId,
            service: lead.service,
            reason: lead.reason
        });

        await lead.save();
        console.log("✅ New lead saved successfully");

        // Provide a more empathetic response based on the context
        const isEmergency = formattedContext.reason.includes('URGENT') || 
                           formattedContext.reason.toLowerCase().includes('emergency');

        if (isEmergency) {
            return `I understand this is a stressful situation, ${name}. I've marked this as urgent, and our dental team will contact you very soon. If you're in severe pain or experiencing significant bleeding, please don't wait - call our emergency dental line immediately. We're here to help you through this.`;
        } else {
            return `Thank you for reaching out, ${name}. I've passed your information to our dental team, and they will contact you soon to discuss your dental care needs. We look forward to helping you achieve your best smile!`;
        }

    } catch (error) {
        console.error("❌ Error saving lead:", error);
        return "I apologize, but I'm having trouble processing your request. For immediate assistance, please call our office directly. Your dental care is important to us.";
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
        
        console.log("🔍 GetLeads - Request details:", {
            businessId: req.params.businessId,
            userBusinessId: req.user?.businessId,
            businessFromMiddleware: business ? {
                id: business._id,
                businessId: business.businessId,
                name: business.businessName
            } : null
        });

        if (!business) {
            console.error("❌ Business not found in request");
            return res.status(404).json({ 
                error: "Business not found.",
                details: "Unable to find business information. Please ensure you're logged in with the correct account."
            });
        }

        if (!business.businessId) {
            console.error("❌ Invalid business ID format");
            return res.status(400).json({ 
                error: "Invalid business ID format.",
                details: "The business ID is missing or invalid. Please contact support if this issue persists."
            });
        }

        // Fetch leads using business.businessId with proper error handling
        const leads = await Lead.find({ businessId: business.businessId })
            .sort({ createdAt: -1 })
            .select('-__v') // Exclude version key
            .lean(); // Convert to plain JavaScript objects for better performance
        
        console.log(`✅ Found ${leads.length} leads for business ${business.businessId}`);
        
        // Format dates and clean up response
        const formattedLeads = leads.map(lead => ({
            ...lead,
            createdAt: lead.createdAt ? lead.createdAt.toISOString() : null,
            lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toISOString() : null,
            interactions: Array.isArray(lead.interactions) ? lead.interactions.map(interaction => ({
                ...interaction,
                timestamp: interaction.timestamp ? interaction.timestamp.toISOString() : null
            })) : []
        }));

        // Send response with metadata
        res.status(200).json({
            success: true,
            count: formattedLeads.length,
            leads: formattedLeads
        });

    } catch (error) {
        console.error("❌ Error fetching leads:", error);
        res.status(500).json({ 
            error: "Failed to fetch leads.",
            details: "An unexpected error occurred while fetching leads. Please try again later."
        });
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
