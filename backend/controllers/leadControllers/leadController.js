import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";

/**
 * Function to capture and store leads in MongoDB.
 * This is your core function that returns a response message.
 */



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
