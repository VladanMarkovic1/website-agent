import Lead from "../../models/Lead.js";
import Business from "../../models/Business.js";
import Service from "../../models/Service.js";
import { trackChatEvent } from "../analyticsControllers/trackEventService.js";

/**
 * Function to capture and store leads in MongoDB.
 * This is your core function that returns a response message.
 */

// Helper function to find a service name within text
async function findServiceInText(businessId, text) {
    if (!text) return null;
    const serviceData = await Service.findOne({ businessId });
    if (!serviceData || !serviceData.services) return null;

    const normalizedText = text.toLowerCase();
    // Find the first service whose name appears in the text
    const foundService = serviceData.services.find(service => 
        service.name && normalizedText.includes(service.name.toLowerCase())
    );
    return foundService ? foundService.name : null;
}

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

        // --- Determine Service for Lead Record ---
        let finalService = serviceInterest; // Start with explicitly provided interest
        // If no explicit interest or it's the default, try extracting from problem description
        if (!finalService || finalService === 'your dental needs' || finalService === 'Dental Consultation') {
             console.log('[Service Extraction] Trying to find service in problemDescription:', problemDescription);
             const extractedService = await findServiceInText(businessId, problemDescription);
             if (extractedService) {
                 finalService = extractedService;
                 console.log('[Service Extraction] Found service in text:', finalService);
             } else {
                 finalService = 'Dental Consultation'; // Fallback if nothing found
                 console.log('[Service Extraction] No specific service found in text, using default.');
             }
        }
        console.log('[Service Extraction] Final service to be saved:', finalService);
        // --- End Service Determination ---

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
            existingLead.service = finalService;
            existingLead.reason = formattedContext.reason;
            existingLead.lastContactedAt = new Date(); // Update last contacted time
            existingLead.status = 'new'; // **RESET STATUS TO NEW on re-engagement**
            
            // Update interaction log
            existingLead.interactions.push({
                type: 'chatbot',
                status: 'Re-engaged via Chatbot', // Changed status message
                message: `User re-engaged via chatbot. Concern: ${formattedContext.reason}`,
                service: finalService // Log the specific interest if available
            });
            
            await existingLead.save();
            console.log("✅ Existing lead updated successfully (Status reset to 'new')"); // Updated log
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
            service: finalService,
            reason: formattedContext.reason,
            source: 'chatbot',
            status: 'new', // Explicitly 'new', which is valid
            lastContactedAt: new Date(),
            interactions: [{
                 type: 'chatbot',
                 status: 'Lead Created',
                 message: `Initial contact via chatbot. Concern: ${formattedContext.reason}`,
                 service: finalService // Keep this as the potentially more specific interest if available
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
        console.log(`[LeadController] About to call trackChatEvent for NEW_LEAD. BusinessId: ${businessId}, Service: ${finalService}`);
        // Track the new lead event
        await trackChatEvent(businessId, 'NEW_LEAD', { service: finalService });

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
