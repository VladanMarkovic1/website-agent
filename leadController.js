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

        // **Ensure message is valid before calling .match()**
        if (!message || typeof message !== "string") {
            console.error("❌ Error: Invalid message format.");
            return "⚠️ Error: Invalid message format.";
        }

        // Regular expression to detect name, phone number, and email in the message
        const contactRegex = /name:\s*([A-Za-z\s]+),\s*phone:\s*(\+?\d+),\s*email:\s*([\w\.-]+@\w+\.\w+)/i;
        const contactMatch = message.match(contactRegex);

        if (!contactMatch) {
            console.log("⚠️ No lead information detected.");
            return null;
        }

        const name = contactMatch[1].trim();
        const phone = contactMatch[2].trim();
        const email = contactMatch[3].trim();

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
