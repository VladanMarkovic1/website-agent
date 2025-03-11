import OpenAI from "openai";
import Service from "../models/Service.js";
import ExtraInfo from "../models/ExtraInfo.js";
import Contact from "../models/Contact.js";
import Business from "../models/Business.js";
import { saveLead } from "./leadController.js"; 
import stringSimilarity from "string-similarity"; // ✅ Import string-similarity

// Make OpenAI optional for testing
let openai;
try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (error) {
    console.log('OpenAI initialization failed, running in test mode');
    openai = null;
}

// Enhanced session storage
const userSessions = {}; // Store user's service interest in memory
const userMessages = {}; // Store previous messages for each user
const conversationMemory = {}; // Store conversation context and history

// Add these to the top with other constants
const affirmativeResponses = ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup', 'definitely', 'absolutely'];

// Initialize or get session memory
function getSessionMemory(businessId) {
    if (!conversationMemory[businessId]) {
        conversationMemory[businessId] = {
            currentService: null,
            mentionedServices: [],
            lastQuestion: null,
            messageHistory: [], // Store full message history
            context: {
                priceAsked: false,
                introductionGiven: false,
                timelineDiscussed: false,
                bookingAttempted: false
            }
        };
    }
    return conversationMemory[businessId];
}

// Update session memory with new information
function updateSessionMemory(businessId, message, detectedService) {
    const memory = getSessionMemory(businessId);
    const lowercaseMsg = message.toLowerCase();

    // Check for affirmative response to previous question
    if (affirmativeResponses.includes(lowercaseMsg) && memory.lastQuestion) {
        const previousQuestion = memory.lastQuestion;
        memory.lastQuestion = 'booking'; // Progress to booking
        
        // Store the affirmative response
        memory.messageHistory.push({
            message: message,
            timestamp: new Date(),
            isUser: true,
            service: memory.currentService,
            context: {
                wasAffirmative: true,
                previousQuestion: previousQuestion
            }
        });
        
        return memory;
    }

    // Store the message with enhanced context
    memory.messageHistory.push({
        message: message,
        timestamp: new Date(),
        isUser: true,
        service: detectedService || memory.currentService,
        context: {
            priceAsked: lowercaseMsg.includes('price') || lowercaseMsg.includes('cost'),
            introRequested: lowercaseMsg.includes('introduce') || lowercaseMsg.includes('tell me about'),
            timelineAsked: lowercaseMsg.includes('long') || lowercaseMsg.includes('time') || 
                         lowercaseMsg.includes('duration') || lowercaseMsg.includes('takes'),
            bookingRequested: lowercaseMsg.includes('book') || lowercaseMsg.includes('appointment')
        }
    });

    // Update service tracking with enhanced context
    if (detectedService) {
        memory.currentService = detectedService;
        if (!memory.mentionedServices.includes(detectedService)) {
            memory.mentionedServices.push(detectedService);
        }
        
        // Initialize or update service-specific context
        if (!memory.serviceContext) memory.serviceContext = {};
        if (!memory.serviceContext[detectedService]) {
            memory.serviceContext[detectedService] = {
                priceAsked: false,
                introductionGiven: false,
                timelineDiscussed: false,
                bookingAttempted: false,
                lastDiscussed: new Date()
            };
        }
    }

    // Update question tracking
    if (lowercaseMsg.includes('price') || lowercaseMsg.includes('cost')) {
        memory.lastQuestion = 'price';
        if (detectedService) memory.serviceContext[detectedService].priceAsked = true;
    } else if (lowercaseMsg.includes('introduce') || lowercaseMsg.includes('tell me about')) {
        memory.lastQuestion = 'introduction';
        if (detectedService) memory.serviceContext[detectedService].introductionGiven = true;
    } else if (lowercaseMsg.includes('long') || lowercaseMsg.includes('time') || 
               lowercaseMsg.includes('duration') || lowercaseMsg.includes('takes')) {
        memory.lastQuestion = 'timeline';
        if (detectedService) memory.serviceContext[detectedService].timelineDiscussed = true;
    } else if (lowercaseMsg.includes('book') || lowercaseMsg.includes('appointment')) {
        memory.lastQuestion = 'booking';
        if (detectedService) memory.serviceContext[detectedService].bookingAttempted = true;
    }

    return memory;
}

// Get relevant previous messages about a service
function getPreviousServiceInfo(memory, service) {
    if (!memory.messageHistory) return null;

    const relevantMessages = memory.messageHistory
        .filter(msg => msg.service === service)
        .slice(-3); // Get last 3 relevant messages

    return relevantMessages.length > 0 ? relevantMessages : null;
}

// Generate response based on conversation memory
function generateMemoryBasedResponse(memory, serviceInfo) {
    const service = memory.currentService;
    if (!service || !serviceInfo[service]) return null;

    const info = serviceInfo[service];
    const serviceContext = memory.serviceContext[service];
    const previousMessages = getPreviousServiceInfo(memory, service);

    // Reference other services if they were discussed
    const otherServicesContext = memory.mentionedServices
        .filter(s => s !== service)
        .map(s => memory.serviceContext[s])
        .filter(Boolean);

    // Check if this is an affirmative response
    const lastMessage = memory.messageHistory[memory.messageHistory.length - 1];
    const isAffirmativeResponse = lastMessage?.context?.wasAffirmative;

    switch (memory.lastQuestion) {
        case 'price':
            let priceResponse = `For ${service}, the investment typically ranges from ${info.pricing.range}. This includes ${info.pricing.features}.`;
            
            // Add references to other services if their prices were discussed
            if (otherServicesContext.length > 0) {
                const otherServices = memory.mentionedServices.filter(s => s !== service);
                if (otherServices.length === 1) {
                    priceResponse += ` As we discussed earlier about ${otherServices[0]}, `;
                } else {
                    priceResponse += ` As with our other services, `;
                }
                priceResponse += `we offer flexible payment plans starting at $199/month.`;
            } else {
                priceResponse += ` We offer flexible payment plans starting at $199/month.`;
            }
            
            priceResponse += ` To get your personalized quote and learn about our current offers, please share your name, phone number, and email address.`;
            return priceResponse;

        case 'introduction':
            let introResponse = `${serviceContext.priceAsked ? "In addition to the pricing I mentioned, " : ""}At Revive Dental, we offer high-quality ${service.toLowerCase()} that are ${info.description} designed to ${info.benefits}. Our expert team ensures ${info.features}, and the result is a beautiful and natural-looking outcome.`;
            
            // Add timeline info if previously discussed
            if (serviceContext.timelineDiscussed) {
                introResponse += ` As we discussed, the treatment typically takes ${info.timeline}.`;
            } else {
                introResponse += ` The treatment typically takes ${info.timeline}.`;
            }

            // Add pricing reference if previously discussed
            if (serviceContext.priceAsked) {
                introResponse += ` And remember, we offer flexible payment plans starting at $199/month.`;
            }

            // Reference other services if relevant
            if (otherServicesContext.length > 0) {
                introResponse += ` Like our ${memory.mentionedServices.filter(s => s !== service).join(" and ")} services, `;
                introResponse += `we maintain the highest standards of care and patient comfort.`;
            }

            introResponse += ` Would you like to schedule a consultation to learn more?`;
            return introResponse;

        case 'timeline':
            let timelineResponse = `For ${service}, the complete treatment typically takes ${info.timeline}. During this time, we'll ensure ${info.features} for the best results.`;
            
            // Reference previous price discussion if exists
            if (serviceContext.priceAsked) {
                timelineResponse += ` As mentioned earlier, the investment ranges from ${info.pricing.range}, and we're currently offering special financing options.`;
            }

            // Add introduction reference if exists
            if (serviceContext.introductionGiven) {
                timelineResponse += ` As I explained before, this will give you a beautiful, natural-looking result.`;
            }

            // Reference other services' timelines if discussed
            if (otherServicesContext.length > 0) {
                const otherServices = memory.mentionedServices.filter(s => s !== service);
                if (otherServices.length === 1) {
                    timelineResponse += ` Unlike ${otherServices[0]} which takes ${serviceInfo[otherServices[0]].timeline}, `;
                    timelineResponse += `${service} has its own unique treatment timeline to ensure optimal results.`;
                }
            }

            timelineResponse += ` Would you like to schedule a consultation to discuss your specific case?`;
            return timelineResponse;

        case 'booking':
            let bookingResponse = `Excellent! Let's schedule your ${service.toLowerCase()} consultation right away.`;
            
            // Reference previous discussions
            if (serviceContext.priceAsked) {
                bookingResponse += ` As we discussed, the investment ranges from ${info.pricing.range}.`;
            }
            
            if (serviceContext.timelineDiscussed) {
                bookingResponse += ` The treatment will take ${info.timeline}, and`;
            } else {
                bookingResponse += ` We currently have`;
            }
            
            bookingResponse += ` a special offer for ${service.toLowerCase()} treatments with limited slots available this week.`;
            
            // Add comprehensive consultation details
            bookingResponse += ` During your consultation, our expert team will:
1. Evaluate your specific needs
2. Create a personalized treatment plan
3. Discuss financing options starting at $199/month
4. Answer all your questions about the procedure`;

            // Reference other services if discussed
            if (otherServicesContext.length > 0) {
                bookingResponse += `\nWe can also discuss the other services you were interested in (${memory.mentionedServices.filter(s => s !== service).join(", ")}).`;
            }
            
            bookingResponse += `\n\nTo secure your appointment, please provide your:
• Name
• Phone number
• Email address`;
            
            return bookingResponse;

        default:
            return null;
    }
}

const highIntentKeywords = ["price", "cost", "how much", "book", "appointment", "available", "consultation", "urgent", "need now", "schedule", "important", "now"];
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

        // Get or initialize session memory
        const memory = getSessionMemory(businessId);
        
        // First, check if this is contact information being provided
        const contactInfo = extractContactInfo(message);
        if (contactInfo) {
            console.log("Contact info detected:", contactInfo);
            const { name, phone, email } = contactInfo;
            const serviceInterest = memory.currentService || "General Inquiry";
            
            const leadMessage = `name: ${name}, phone: ${phone}, email: ${email}`;
            
            try {
                await saveLead(businessId, leadMessage, serviceInterest);
                // Clean up session data
                delete conversationMemory[businessId];
                delete userMessages[businessId];
                delete userSessions[businessId];
                return `✅ Thank you, ${name}! We've recorded your details for **${serviceInterest}**. Our team will reach out to you soon!`;
            } catch (error) {
                console.error("Error saving lead:", error);
                return "⚠️ Sorry, there was an error processing your request. Please try again.";
            }
        }

        // Fetch business data
        const businessData = await getBusinessDataForChatbot(businessId);
        if (!businessData) return "⚠️ Sorry, I couldn't fetch business details at the moment.";

        const { services } = businessData;
        
        // Detect service from message or use existing context
        let detectedService = null;
        
        // Check if we're continuing discussion about current service
        if (memory.currentService) {
            const hasServiceReference = message.toLowerCase().includes('it') || 
                                     message.toLowerCase().includes('this') || 
                                     message.toLowerCase().includes('that') || 
                                     message.toLowerCase().includes('this service');
            if (hasServiceReference) {
                detectedService = memory.currentService;
            }
        }

        // If no service reference found, try to detect new service
        if (!detectedService) {
            const userInput = message.toLowerCase();
            
            // Check against service variations
            for (const [service, variations] of Object.entries(serviceVariations)) {
                if (variations.some(v => userInput.includes(v))) {
                    const matchingService = services.find(s => 
                        s.name.toLowerCase().includes(service)
                    );
                    if (matchingService) {
                        detectedService = matchingService.name;
                        break;
                    }
                }
            }
        }

        // Update session memory with new information
        const updatedMemory = updateSessionMemory(businessId, message, detectedService);

        // Define comprehensive service information
        const serviceInfo = {
            'Veneers': {
                description: 'custom-made, ultra-thin porcelain shells',
                benefits: 'enhance your smile by fixing stains, chips, gaps, or discoloration',
                timeline: '2-3 visits',
                features: 'minimally invasive procedure with natural-looking results',
                pricing: { range: '$800-$2,500 per tooth', features: 'custom design and fitting' }
            },
            'Dental Implants': {
                description: 'permanent tooth replacement solution',
                benefits: 'restore full functionality and natural appearance of missing teeth',
                timeline: '3-6 months total treatment time',
                features: 'advanced titanium integration technology with custom-matched crowns',
                pricing: { range: '$3,000-$6,000 per implant', features: 'complete procedure including implant, abutment, and crown' }
            },
            'Teeth Whitening': {
                description: 'professional-grade teeth whitening treatment',
                benefits: 'achieve a brighter, whiter smile by removing years of stains',
                timeline: '1-2 sessions of 60-90 minutes each',
                features: 'safe and effective whitening agents with lasting results',
                pricing: { range: '$200-$1,000', features: 'professional in-office treatment' }
            },
            'Root Canal': {
                description: 'advanced endodontic treatment',
                benefits: 'save your natural tooth and eliminate pain from infection',
                timeline: '1-2 appointments',
                features: 'modern techniques and equipment for comfortable treatment',
                pricing: { range: '$700-$1,500 per tooth', features: 'complete procedure including filling' }
            },
            'Braces & Aligners': {
                description: 'orthodontic alignment solution',
                benefits: 'straighten teeth and correct bite issues',
                timeline: '12-24 months on average',
                features: 'choice of traditional braces or clear aligners',
                pricing: { range: '$3,000-$7,000', features: 'complete orthodontic treatment' }
            },
            'Wisdom Tooth Extraction': {
                description: 'surgical tooth removal procedure',
                benefits: 'prevent or resolve issues caused by wisdom teeth',
                timeline: '45-90 minutes per procedure, 1-week recovery',
                features: 'sedation options available for comfort',
                pricing: { range: '$200-$700 per tooth', features: 'extraction and aftercare' }
            },
            'Dental Cleaning': {
                description: 'professional dental hygiene service',
                benefits: 'maintain oral health and prevent cavities',
                timeline: '30-60 minutes per session',
                features: 'thorough cleaning, polishing, and fluoride treatment',
                pricing: { range: '$75-$200', features: 'comprehensive cleaning and check-up' }
            },
            'Pediatric Dentistry': {
                description: 'specialized dental care for children',
                benefits: 'ensure proper dental development and oral health',
                timeline: '30-45 minutes per visit',
                features: 'child-friendly environment and gentle approach',
                pricing: { range: '$50-$300', features: 'varies by specific treatment needed' }
            }
        };

        // Enhanced service detection function
        function detectServiceFromMessage(message, services) {
            const lowercaseMsg = message.toLowerCase();
            
            // Check direct service mentions first
            for (const [serviceName, info] of Object.entries(serviceInfo)) {
                if (lowercaseMsg.includes(serviceName.toLowerCase())) {
                    return serviceName;
                }
            }
            
            // Check service variations
            for (const [service, variations] of Object.entries(serviceVariations)) {
                if (variations.some(v => lowercaseMsg.includes(v))) {
                    // Match the variation to the full service name
                    const fullServiceName = Object.keys(serviceInfo).find(name => 
                        name.toLowerCase().includes(service.toLowerCase())
                    );
                    if (fullServiceName) return fullServiceName;
                }
            }
            
            return null;
        }

        // Generate response based on memory
        const memoryBasedResponse = generateMemoryBasedResponse(updatedMemory, serviceInfo);
        let response;
        
        if (memoryBasedResponse) {
            response = memoryBasedResponse;
        } else {
            // Fallback to general response if no specific context
            const serviceList = services.map(service => service.name).join(", ");
            response = `We offer a range of dental services including ${serviceList}. ${
                updatedMemory.mentionedServices.length > 0 
                    ? `I see you were interested in ${updatedMemory.mentionedServices.join(" and ")} earlier. ` 
                    : ""
            }To help you find the best treatment option for your needs, please let me know which service you're interested in, or share your name, phone number, and email address for a personalized consultation.`;
        }

        // Store bot's response in history
        updatedMemory.messageHistory.push({
            message: response,
            timestamp: new Date(),
            isUser: false,
            service: updatedMemory.currentService
        });
        
        return response;

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