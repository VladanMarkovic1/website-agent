import OpenAI from "openai";
import Service from "../models/Service.js";
import ExtraInfo from "../models/ExtraInfo.js";
import Contact from "../models/Contact.js";
import Business from "../models/Business.js";
import { saveLead } from "./leadController.js"; 
import stringSimilarity from "string-similarity"; // ✅ Import string-similarity

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const userSessions = {}; // Store user's service interest in memory
const highIntentKeywords = ["price", "cost", "how much", "book", "appointment", "available", "consultation", "urgent", "need now"];
const serviceRelatedWords = ['service', 'treatment', 'procedure', 'offer', 'dental', 'teeth', 'tooth'];

// Common variations of service names for better matching
const serviceVariations = {
    'veneers': ['vener', 'veneer', 'veners'],
    'implants': ['implant', 'implents', 'implent'],
    'whitening': ['whiten', 'whitning', 'whitting'],
    'cleaning': ['clean', 'cleanning', 'cleans'],
    'orthodontics': ['ortho', 'orthodontic', 'braces'],
    'extraction': ['extract', 'remove', 'removing']
};

/**
 * Fetch services, FAQs, and contact details for the chatbot
 * Prioritizes manually updated data over scraped data
 */
export const getBusinessDataForChatbot = async (businessId) => {
    try {
        console.log(`🤖 Fetching chatbot data for business: ${businessId}`);

        // Fetch Business Name
        const business = await Business.findOne({ businessId }).lean();
        const businessName = business?.businessName || "our clinic";

        // Fetch manually overridden services first
        const serviceData = await Service.findOne({ businessId }).lean();
        const services = serviceData?.services || [];

        // Fetch FAQs
        const extraInfoData = await ExtraInfo.findOne({ businessId }).lean();
        const faqs = extraInfoData?.faqs || [];

        // Fetch contact details
        const contactData = await Contact.findOne({ businessId }).lean();
        const contactDetails = contactData || {};

        console.log(`✅ Chatbot Data Fetched: Services: ${services.length}, FAQs: ${faqs.length}, Contact: ${Object.keys(contactDetails).length}`);

        return { businessName, services, faqs, contactDetails };

    } catch (error) {
        console.error("❌ Error fetching chatbot data:", error);
        return null;
    }
};

/**
 * Handle incoming chatbot messages with sales-driven responses
 */
export const handleChatMessage = async (message, businessId) => {
    try {
        console.log(`💬 Processing chat message: "${message}" for business ${businessId}`);

        if (!businessId) return "⚠️ Error: Business ID is missing.";

        // First, check if this is contact information being provided
        const contactInfo = extractContactInfo(message);
        if (contactInfo) {
            console.log("Contact info detected:", contactInfo);
            const { name, phone, email } = contactInfo;
            const serviceInterest = userSessions[businessId] || "General Inquiry";
            
            // Always format the lead message in the same way
            const leadMessage = `name: ${name}, phone: ${phone}, email: ${email}`;
            
            try {
                // Always attempt to save the lead
                await saveLead(businessId, leadMessage, serviceInterest);
                
                // Always return the same confirmation message format
                return `✅ Thank you, ${name}! We've recorded your details for **${serviceInterest}**. Our team will reach out to you soon!`;
            } catch (error) {
                console.error("Error saving lead:", error);
                return "⚠️ Sorry, there was an error processing your request. Please try again.";
            } finally {
                // Clean up the session
                delete userSessions[businessId];
            }
        }

        // Fetch business data
        const businessData = await getBusinessDataForChatbot(businessId);
        if (!businessData) return "⚠️ Sorry, I couldn't fetch business details at the moment.";

        const { businessName, services, contactDetails } = businessData;
        const serviceNames = services.map(service => service.name);
        const serviceList = serviceNames.length > 0 ? serviceNames.join(", ") : "various high-quality dental services.";

        // ✅ **Enhanced Fuzzy Matching for Service Interest**
        const userInput = message.toLowerCase();
        const serviceOptions = serviceNames.map(name => name.toLowerCase());
        
        let detectedService = null;
        let bestMatchRating = 0;

        // Check against service variations first
        for (const [service, variations] of Object.entries(serviceVariations)) {
            if (variations.some(v => userInput.includes(v))) {
                const matchingService = services.find(s => 
                    s.name.toLowerCase().includes(service)
                );
                if (matchingService) {
                    detectedService = matchingService.name;
                    bestMatchRating = 1;
                    break;
                }
            }
        }

        // If no match found through variations, try fuzzy matching
        if (!detectedService) {
            // Split user input into words
            const userWords = userInput.split(/\s+/);
            
            serviceOptions.forEach((serviceName, index) => {
                // Try matching full service name
                const fullNameMatch = stringSimilarity.compareTwoStrings(userInput, serviceName);
                
                // Try matching individual words
                const serviceWords = serviceName.split(/\s+/);
                const wordMatches = userWords.map(userWord => 
                    serviceWords.map(serviceWord => 
                        stringSimilarity.compareTwoStrings(userWord, serviceWord)
                    ).reduce((max, curr) => Math.max(max, curr), 0)
                );
                
                const wordMatchAverage = wordMatches.reduce((sum, curr) => sum + curr, 0) / wordMatches.length;
                const matchRating = Math.max(fullNameMatch, wordMatchAverage);

                if (matchRating > bestMatchRating && matchRating >= 0.3) {
                    bestMatchRating = matchRating;
                    detectedService = services[index].name;
                }
            });
        }

        // Send Call-To-Action for Correct Service Match
        if (detectedService) {
            userSessions[businessId] = detectedService;
            console.log(`✅ Service Detected: ${detectedService} → Sending CTA Response (Match Rating: ${bestMatchRating})`);
            return `📞 Great choice! Our **${detectedService}** service is highly recommended. To schedule your consultation, please provide your contact information in this format:\nname: Your Name phone: Your Phone email: Your Email`;
        }

        // ✅ **Detect High-Intent Users and Service Inquiries**
        const isHighIntent = highIntentKeywords.some(keyword => message.toLowerCase().includes(keyword));
        const isServiceInquiry = serviceRelatedWords.some(word => message.toLowerCase().includes(word));

        // If it's a service inquiry or high intent, send CTA immediately
        if (isServiceInquiry || isHighIntent) {
            let ctaMessage = "";
            if (isServiceInquiry) {
                ctaMessage = `We offer these excellent services: **${serviceList}**. To learn more about any specific service and receive a personalized consultation, please provide your contact information in this format:\nname: Your Name phone: Your Phone email: Your Email`;
            } else {
                ctaMessage = `💰 Our pricing depends on the specific treatment you need. We offer competitive and transparent pricing. To receive detailed pricing information and discuss the best options for you, please provide your contact information in this format:\nname: Your Name phone: Your Phone email: Your Email`;
            }
            return ctaMessage;
        }

        // ✅ **Fallback AI Response**
        console.log("🤖 No CTA triggered → Using OpenAI for fallback response.");
        const prompt = `
        You are a **sales-driven AI chatbot** representing **${businessName}**, a leading dental clinic.
        Your goal is to **convert users into booked consultations** by providing persuasive and sales-focused responses.

        **Key Tactics:**
        - Answer like a **real human** who cares about the user.
        - **Personalize** responses with the user's name.
        - Always mention the **business name** in responses.
        - Use **urgency** (limited slots, special discounts, expert team).
        - Ensure every response has a **Call-To-Action (CTA)**.
        - Push users toward **booking an appointment**.

        **User Message:** "${message}"
        **Business Services:** ${serviceList}
        **Contact Details:** Phone: ${contactDetails.phone || "Not available"}, Email: ${contactDetails.email || "Not available"}

        **🔥 High-Intent Handling:** ${
            isHighIntent
                ? "This user is showing strong interest! Offer them an immediate booking option or special deal."
                : "This user seems to be browsing. Engage them and encourage action."
        }

        Provide a response that **sells effectively and includes a Call-To-Action (CTA)**.
        `;

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.7,
        });

        const finalResponse = aiResponse.choices[0]?.message?.content.trim() || "⚠️ I'm sorry, but I couldn't generate a response.";

        return finalResponse;
    } catch (error) {
        console.error("❌ Error handling chat message:", error);
        return "⚠️ Sorry, there was an error processing your request.";
    }
};

/**
 * Extract contact information from a message
 */
function extractContactInfo(message) {
    console.log("Attempting to extract contact info from:", message);

    // Try the strict format first (name: value)
    const strictRegex = /name:\s*([^,\n]+).*phone:\s*([^,\n]+).*email:\s*([^,\n]+)/i;
    const strictMatch = message.match(strictRegex);
    
    if (strictMatch) {
        return {
            name: strictMatch[1].trim(),
            phone: strictMatch[2].trim(),
            email: strictMatch[3].trim()
        };
    }

    // Try more flexible format (comma or space separated values)
    // First split by commas, then by spaces if needed
    let parts = message.split(',').map(p => p.trim());
    
    // If we don't have at least 2 parts after comma split, try space split
    if (parts.length < 2) {
        parts = message.split(/\s+/).filter(p => p.trim());
    }

    console.log("Parts after splitting:", parts);

    if (parts.length >= 2) {
        // Look for email pattern (more flexible)
        const emailPart = parts.find(p => p.includes('@'));
        if (emailPart) {
            // Look for phone pattern - more flexible pattern
            const phonePart = parts.find(p => {
                const digits = p.replace(/\D/g, '');
                return digits.length >= 6 && digits.length <= 15 && p !== emailPart;
            });

            if (phonePart) {
                // Everything that's not email or phone is considered part of the name
                const nameParts = parts.filter(p => {
                    const isEmail = p.includes('@');
                    const isPhone = p.replace(/\D/g, '').length >= 6;
                    return !isEmail && !isPhone;
                });

                if (nameParts.length > 0) {
                    const contactInfo = {
                        name: nameParts.join(' ').trim(),
                        phone: phonePart.trim(),
                        email: emailPart.trim()
                    };
                    console.log("Extracted contact info:", contactInfo);
                    return contactInfo;
                }
            }
        }
    }

    // Try to find any three parts that look like name, phone, and email
    if (parts.length >= 3) {
        const emailParts = parts.filter(p => p.includes('@'));
        const phoneParts = parts.filter(p => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 6 && digits.length <= 15 && !p.includes('@');
        });
        const nameParts = parts.filter(p => {
            const isEmail = p.includes('@');
            const isPhone = p.replace(/\D/g, '').length >= 6;
            return !isEmail && !isPhone;
        });

        if (emailParts.length > 0 && phoneParts.length > 0 && nameParts.length > 0) {
            const contactInfo = {
                name: nameParts.join(' ').trim(),
                phone: phoneParts[0].trim(),
                email: emailParts[0].trim()
            };
            console.log("Extracted contact info (alternative method):", contactInfo);
            return contactInfo;
        }
    }

    console.log("No contact info found");
    return null;
}