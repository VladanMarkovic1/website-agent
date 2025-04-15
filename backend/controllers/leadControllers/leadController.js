import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import { sendInstantConfirmation } from "../emailControllers/emailService.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";

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

export const saveLead = async (leadContext) => {
    try {
        // Log the entire received object immediately
        console.log("Raw leadContext received in saveLead:", JSON.stringify(leadContext, null, 2));
        
        // Destructure the needed properties from the leadContext object
        const {
            businessId,
            name,
            phone,
            email,
            serviceInterest,
            problemDescription,
            messageHistory 
        } = leadContext;

        console.log("🔍 Finding business (after destructuring):", { businessId });
        const business = await Business.findOne({ businessId });
        
        if (!business) {
            console.error("❌ Business not found:", businessId);
            // Return an error or specific message if needed
            throw new Error("Business not found during lead save."); 
        }

        // Basic validation (already have some in the caller, but good practice)
        if (!name || !phone) { // Email might be optional
            console.error("❌ Missing required contact info in leadContext:", { name, phone });
            throw new Error("Missing required contact information (name/phone) for lead.");
        }

        // Format context properly using destructured values
        // (Keep your existing context formatting or simplify as needed)
        const reasonText = problemDescription ? 
                         `Patient's Concern: ${problemDescription}` : 
                         `Interest in: ${serviceInterest || 'General Inquiry'}`;
        
        const formattedContext = {
            initialMessage: messageHistory ? (messageHistory.find(m => m.role === 'user')?.content || problemDescription || "N/A") : (problemDescription || "N/A"),
            reason: reasonText,
            conversationSummary: messageHistory ? messageHistory.map(m => `${m.role}: ${m.content}`).slice(-5).join('\n') : "N/A"
        };

        console.log('Formatted Lead Context:', formattedContext);

        // Check for existing lead
        const existingLead = await Lead.findOne({
            businessId: business.businessId,
            // Use more robust check if email is optional
            $or: [{ phone }, ...(email ? [{ email }] : [])] 
        });

        if (existingLead) {
            console.log("📝 Updating existing lead:", existingLead._id);
            
            // Update fields for existing lead
            existingLead.name = name;
            existingLead.phone = phone;
            existingLead.email = email || existingLead.email; // Keep old email if new one not provided
            existingLead.service = serviceInterest || existingLead.service;
            existingLead.reason = formattedContext.reason; // Update reason
            existingLead.lastContactedAt = new Date(); // Update last contacted time
            // Optionally update context or add interaction
            existingLead.interactions.push({
                type: 'chatbot',
                status: 'Updated Contact Info',
                message: `User provided/updated contact info. Concern: ${formattedContext.reason}`,
                service: serviceInterest
            });
            
            await existingLead.save();
            console.log("✅ Existing lead updated successfully");
            // Return confirmation for existing lead
            return `Thank you, ${name}. I've updated your information with us.`
        }

        // Create NEW lead with required fields
        console.log("➕ Creating new lead...");
        const lead = new Lead({
            businessId: business.businessId,
            name,
            phone,
            email,
            service: serviceInterest || 'Dental Consultation', // Changed fallback
            reason: formattedContext.reason, // Use formatted reason
            source: 'chatbot',
            status: 'new', // Explicitly 'new', which is valid
            lastContactedAt: new Date(),
            interactions: [{
                 type: 'chatbot',
                 status: 'Lead Created',
                 message: `Initial contact via chatbot. Concern: ${formattedContext.reason}`,
                 service: serviceInterest // Keep this as the potentially more specific interest if available
            }],
            // Store raw message history if needed, or just the summary
            // context: { rawHistory: messageHistory }
        });

        console.log("Creating new lead with data:", {
            businessId: lead.businessId,
            name: lead.name,
            phone: lead.phone,
            service: lead.service,
            status: lead.status
        });

        await lead.save();
        console.log("✅ New lead saved successfully");

        // --- ADD LOG BEFORE TRACKING --- 
        console.log(`[LeadController] About to call trackChatEvent for NEW_LEAD. BusinessId: ${businessId}, Service: ${serviceInterest}`);
        // Track the new lead event
        await trackChatEvent(businessId, 'NEW_LEAD', { service: serviceInterest });

        // Return confirmation for new lead (maybe use template from openaiService?)
        // Using the contact_confirmation template structure:
        return `✅ Thank you ${name}! I've noted your interest in ${lead.service}. Our specialist will contact you at ${phone} soon.`;

    } catch (error) {
        console.error("❌ Error in saveLead function:", error);
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            console.error("Validation Errors:", error.errors);
            throw new Error(`Lead validation failed: ${error.message}`); // Re-throw specific error
        }
        throw error; // Re-throw other errors to be caught by the caller
    }
};

/**
 * Express route handler for creating a lead.
 * Expects businessId, message, and optionally serviceInterest in req.body.
 */
export const createLeadHandler = async (req, res) => {
    try {
        const { businessId, message, serviceInterest } = req.body;
        const responseMessage = await saveLead({ businessId, message, serviceInterest });
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

        const oldStatus = lead.status;
        
        // Update status and add to call history
        lead.status = status;
        lead.lastContactedAt = new Date();
        lead.callHistory.push({
            status,
            notes: `Status updated to ${status}`,
            timestamp: new Date()
        });

        // Track the status change in analytics
        await trackChatEvent(lead.businessId, 'LEAD_STATUS_UPDATE', {
            oldStatus: oldStatus,
            newStatus: status
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
