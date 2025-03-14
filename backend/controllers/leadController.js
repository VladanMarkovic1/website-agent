import Lead from "../models/Lead.js";
import { sendInstantConfirmation } from "../utils/emailService.js";

/**
 * Function to capture and store leads in MongoDB.
 */
export const saveLead = async (businessId, message, serviceInterest = "General Inquiry") => {
    try {
        console.log(`📥 Processing lead capture for business: ${businessId}, Service Interest: ${serviceInterest}`);

        // **Check if businessId is valid**
        if (!businessId) {
            console.error("❌ Error: businessId is missing.");
            return "⚠️ Error: Missing business ID.";
        }

        // **Ensure message is valid before processing**
        if (!message || typeof message !== "string") {
            console.error("❌ Error: Invalid message format.");
            return "⚠️ Error: Invalid message format.";
        }

        // Extract name, phone, and email from the message
        const parts = message.split(/[,:]/).map(part => part.trim());
        let name, phone, email;

        // Try to find each piece of information
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].toLowerCase();
            const value = parts[i + 1]?.trim();

            if (part.includes('name') && value) {
                name = value;
                i++; // Skip the next part since we used it as the value
            } else if (part.includes('phone') && value) {
                phone = value;
                i++;
            } else if (part.includes('email') && value) {
                email = value;
                i++;
            }
        }

        // If we couldn't find the parts using labels, try to extract them directly
        if (!name || !phone || !email) {
            const emailMatch = message.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            const phoneMatch = message.match(/\b\d[\d\s-]{5,}\d\b/);
            
            if (emailMatch) email = emailMatch[0];
            if (phoneMatch) phone = phoneMatch[0];
            
            // Whatever's left that's not email or phone is probably the name
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

        // Validate that we have all required information
        if (!name || !phone) {
            console.log("⚠️ Missing required contact information");
            console.log("Name:", name);
            console.log("Phone:", phone);
            return null;
        }

        // Check if lead already exists
        const existingLead = await Lead.findOne({ businessId, phone });
        if (existingLead) {
            console.log(`⚠️ Lead already exists: ${name} - ${phone}`);
            return `📞 Thanks, ${name}! We already have your details and will contact you soon.`;
        }

        // Save new lead with priority status based on time
        const currentHour = new Date().getHours();
        const isPriorityHours = currentHour >= 9 && currentHour < 17; // 9 AM to 5 PM

        const newLead = new Lead({
            businessId,
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
                // Log error but don't affect the response
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

export const getLeads = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            return res.status(400).json({ error: "Missing business ID." });
        }

        // Fetch leads specific to the business
        const leads = await Lead.find({ businessId }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, leads });
    } catch (error) {
        console.error("❌ Error fetching leads:", error);
        res.status(500).json({ error: "Internal server error while retrieving leads." });
    }
};



export const updateLeadStatus = async (leadId, status, notes = "") => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            leadId,
            { 
                status,
                lastContactedAt: new Date(),
                $push: { 
                    callHistory: {
                        status,
                        notes,
                        timestamp: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!lead) {
            throw new Error('Lead not found');
        }

        console.log(`✅ Lead ${leadId} status updated to: ${status}`);
        return lead;

    } catch (error) {
        console.error('❌ Error updating lead status:', error);
        throw error;
    }
};
