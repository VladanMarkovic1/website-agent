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

// Helper function to determine lead priority based on time of day
const determinePriority = () => {
    const currentHour = new Date().getHours();
    const isPriorityHours = currentHour >= 9 && currentHour < 17; // 9 AM to 5 PM
    return isPriorityHours ? "high" : "normal";
};

export const saveLead = async (businessId, message, service, additionalInfo = {}) => {
    try {
        // First find the business by the string businessId
        const business = await Business.findOne({ businessId: businessId });
        if (!business) {
            console.error("❌ Business not found:", businessId);
            throw new Error("Business not found");
        }

        console.log("🔍 Found business:", {
            businessId: business.businessId,
            businessObjectId: business._id
        });

        // Extract contact info from the message
        const contactInfo = extractContactInfo(message);
        if (!contactInfo.name || !contactInfo.phone || !contactInfo.email) {
            throw new Error("Missing required contact information");
        }

        // Extract the actual message content by removing contact info
        const messageWithoutContacts = message
            .replace(new RegExp(`${contactInfo.name}`, 'gi'), '')
            .replace(new RegExp(`${contactInfo.phone}`, 'g'), '')
            .replace(new RegExp(`${contactInfo.email}`, 'g'), '')
            .replace(/name:|phone:|email:/gi, '')
            .replace(/,+/g, ',')
            .replace(/\s+/g, ' ')
            .trim();

        // Generate a meaningful reason based on service and message content
        const generateReason = (msg, svc) => {
            const lowercaseMsg = msg.toLowerCase();
            
            // Check for emergency indicators
            if (lowercaseMsg.includes('emergency') || lowercaseMsg.includes('urgent') || 
                lowercaseMsg.includes('pain') || lowercaseMsg.includes('accident')) {
                return `Urgent ${svc} request - Requires immediate attention`;
            }
            
            // Check for consultation/information requests
            if (lowercaseMsg.includes('consult') || lowercaseMsg.includes('information') || 
                lowercaseMsg.includes('details') || lowercaseMsg.includes('learn')) {
                return `Requesting consultation/information about ${svc}`;
            }
            
            // Check for pricing inquiries
            if (lowercaseMsg.includes('price') || lowercaseMsg.includes('cost') || 
                lowercaseMsg.includes('fee') || lowercaseMsg.includes('charge')) {
                return `Inquiring about ${svc} pricing`;
            }
            
            // Check for scheduling/availability
            if (lowercaseMsg.includes('schedule') || lowercaseMsg.includes('book') || 
                lowercaseMsg.includes('appoint') || lowercaseMsg.includes('available')) {
                return `Wants to schedule ${svc}`;
            }
            
            // Default reason
            return `General inquiry about ${svc}`;
        };

        // Check for existing lead with same email or phone using businessId
        const existingLead = await Lead.findOne({
            businessId: business.businessId,
            $or: [
                { email: contactInfo.email },
                { phone: contactInfo.phone }
            ]
        });

        if (existingLead) {
            console.log("📝 Updating existing lead:", existingLead._id);
            // Update existing lead
            existingLead.service = service;
            existingLead.lastContactedAt = new Date();
            existingLead.reason = generateReason(messageWithoutContacts, service);
            
            // Add interaction for the update
            existingLead.interactions.push({
                type: 'chatbot',
                message: messageWithoutContacts,
                service: service,
                timestamp: new Date()
            });

            // Add the user's specific concern as a note
            const userConcern = extractUserConcern(messageWithoutContacts);
            existingLead.callHistory.push({
                notes: `Follow-up Contact - Patient's Concern: ${userConcern}`,
                timestamp: new Date()
            });

            await existingLead.save();
            return `I've updated your information. Someone from our team will be in touch about ${service}.`;
        }

        // Extract user's concern from the message
        const extractUserConcern = (msg) => {
            const lowercaseMsg = msg.toLowerCase();
            const concernIndicators = {
                pain: /(?:tooth|teeth|mouth|jaw|gum)?\s*(?:pain|hurt|hurts|hurting|ache|aches|aching)/i,
                emergency: /(?:emergency|urgent|broken|chipped|knocked|fell|accident)/i,
                cosmetic: /(?:whiten|whitening|straight|straighten|align|veneers|smile|look)/i,
                cleaning: /(?:clean|cleaning|checkup|check-up|check up|routine|regular)/i,
                specific: /(?:cavity|cavities|filling|crown|root canal|implant|bridge|denture)/i
            };

            let concerns = [];
            
            // Check each type of concern
            for (const [type, pattern] of Object.entries(concernIndicators)) {
                const match = msg.match(pattern);
                if (match) {
                    // Extract the full phrase around the match for context
                    const start = Math.max(0, match.index - 20);
                    const end = Math.min(msg.length, match.index + match[0].length + 20);
                    const context = msg.slice(start, end).trim();
                    concerns.push(context);
                }
            }

            // If no specific concerns found, take the first meaningful sentence
            if (concerns.length === 0) {
                const sentences = msg.split(/[.!?]+/).filter(s => s.trim().length > 0);
                if (sentences.length > 0) {
                    concerns.push(sentences[0].trim());
                }
            }

            return concerns.join('; ');
        };

        const userConcern = extractUserConcern(messageWithoutContacts);
        
        // Create new lead using businessId string
        const priority = determinePriority();
        const newLead = new Lead({
            businessId: business.businessId,
            name: contactInfo.name,
            phone: contactInfo.phone,
            email: contactInfo.email,
            service,
            priority,
            reason: generateReason(messageWithoutContacts, service),
            interactions: [{
                type: 'chatbot',
                message: messageWithoutContacts,
                service: service,
                timestamp: new Date()
            }],
            callHistory: [{
                notes: `Initial Contact - Patient's Concern: ${userConcern}`,
                timestamp: new Date()
            }]
        });

        console.log("✨ Creating new lead:", {
            businessId: newLead.businessId,
            name: newLead.name,
            service: newLead.service,
            reason: newLead.reason,
            concern: userConcern
        });

        await newLead.save();
        return `Thanks! We'll contact you soon about ${service}. We'll send more information to ${contactInfo.email}.`;

    } catch (error) {
        console.error('❌ Error saving lead:', error);
        throw error;
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
