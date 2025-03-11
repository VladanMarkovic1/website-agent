import Lead from "../models/Lead.js";

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
        if (!name || !phone || !email) {
            console.log("⚠️ Missing required contact information");
            console.log("Name:", name);
            console.log("Phone:", phone);
            console.log("Email:", email);
            return null;
        }

        // Check if lead already exists
        const existingLead = await Lead.findOne({ businessId, phone });
        if (existingLead) {
            console.log(`⚠️ Lead already exists: ${name} - ${phone}`);
            return `📞 Thanks, ${name}! We already have your details and will contact you soon.`;
        }

        // Save new lead
        const newLead = new Lead({ businessId, name, phone, email, serviceInterest, status: "new" });
        await newLead.save();

        console.log(`✅ New lead captured: ${name} - ${phone}`);
        return `✅ Thank you, ${name}! We've recorded your details for **${serviceInterest}**. Our team will reach out to you soon!`;
    } catch (error) {
        console.error("❌ Error saving lead:", error);
        return "⚠️ Sorry, there was an error processing your request.";
    }
};
