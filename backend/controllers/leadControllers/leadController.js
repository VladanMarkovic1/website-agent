import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import { sendInstantConfirmation } from "../emailControllers/emailService.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";

/**
 * Function to capture and store leads in MongoDB.
 * This is your core function that returns a response message.
 */

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
        // Get businessId from URL parameters, other data from body
        const { businessId } = req.params;
        const { message, serviceInterest } = req.body;

        if (!businessId) {
            return res.status(400).json({ error: "Business ID missing in URL" });
        }
        
        // Extract contact info (name, phone, email) needed by saveLead from body
        // Ensure validation in the route covers these required fields
        const { name, phone, email } = req.body; 

        // Construct the context object for saveLead
        const leadContext = { 
            businessId, 
            name, 
            phone, 
            email, // Pass email if available
            message, // This seems ambiguous, saveLead uses messageHistory/problemDescription
                     // Maybe pass null or a specific source indicator? Let's pass null for now.
            serviceInterest, 
            problemDescription: message, // Assuming the direct POST message IS the problem description
            messageHistory: [{ role: 'user', content: message }] // Provide a minimal history
        };

        const responseMessage = await saveLead(leadContext);
        
        // saveLead now throws errors, so no need to check for !responseMessage here
        // if (!responseMessage) {
        //     return res.status(400).json({ error: "Missing required contact information or lead already exists." });
        // }

        res.status(201).json({ success: true, message: responseMessage }); // Use 201 Created for new resource

    } catch (error) {
        console.error("Error creating lead:", error);
        res.status(error.message?.includes("Missing required contact") ? 400 : 500).json({ 
            error: error.message || "Internal server error while creating lead." 
        });
    }
};
