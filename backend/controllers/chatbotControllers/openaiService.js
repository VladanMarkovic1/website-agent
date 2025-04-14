import OpenAI from "openai";
import dotenv from "dotenv";
import { extractContactInfo } from "./memoryHelpers.js";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Personality traits for consistent tone (needed for AI fallback)
const CHATBOT_PERSONALITY = {
    traits: [
        "professional but warm",
        "empathetic and understanding",
        "knowledgeable about dental procedures (but not a dentist)",
        "helpful without being pushy",
        "takes serious dental concerns seriously",
        "goal is to schedule a consultation or gather contact info",
        "never give medical advice"
    ],
    rules: [
        "Never give medical advice",
        "Never dismiss serious dental concerns.",
        "Don't pretend to be a dentist; emphasize evaluation by a specialist.",
        "Acknowledge the user's statement/concern first.",
        "Gently guide towards scheduling a consultation.",
        "If unsure, express the need for a dentist to evaluate."
    ]
};

// Common greetings and their variations
const GREETINGS = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'hi there', 'hello there', 'greetings'
];

// Dental problem indicators
const DENTAL_PROBLEMS = {
    pain: ['pain', 'hurt', 'ache', 'hurts', 'hurting', 'aching', 'painful',],
    sensitivity: ['sensitive', 'sensitivity', 'cold', 'hot', 'sweet',],
    damage: ['broken', 'chipped', 'cracked', 'loose', 'missing'],
    emergency: ['bleeding', 'swollen', 'swelling', 'infection', 'abscess'],
    appearance: ['dot', 'spot', 'stain', 'discoloration', 'black', 'white', 'yellow', 'brown', 'dark', 'white spot', 'whiteish spot', 'whiteish stain', 'whiteish discoloration', 'something '],
    general: ['cavity', 'decay', 'filling', 'tooth', 'teeth', 'gum', 'jaw']
};

// Common response templates
const RESPONSE_TEMPLATES = {
    greeting: "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
    understanding: "I understand you're interested in learning more about this. As a dental assistant, I want to ensure you get the most accurate information. Would you like me to connect you with our specialist who can provide detailed information about this procedure?",
    contact_request: "Perfect! To connect you with our specialist, I'll need your name, phone number, and email address. 😊",
    emergency: "I understand you're in severe pain - this is an emergency that needs immediate attention!  Let me help you get an urgent appointment RIGHT NOW. Please quickly share your name, phone number, and email, and our emergency dental team will contact you immediately. We prioritize emergency cases and will get you seen as soon as possible! ",
    dental_problem: (problem) => `I understand your concern about ${problem}. This should be evaluated by our dental team. Let me help you schedule a consultation - what's your name, phone number, and email?`,
    visual_concern: (concern) => `Okay, I understand you've noticed a ${concern} on your tooth. It's always a good idea to have our dental team take a look at changes like that to see what's causing it. Let me help you schedule a consultation - what's your name, phone number, and email?`,
    service_inquiry: (service) => `As a dental assistant, I want to ensure you get the most accurate information about ${service}. Our specialist would be happy to explain everything in detail. What's your name, phone number, and email so I can arrange this?`,
    contact_confirmation: (name, service, phone) => 
        `✅ Thank you ${name}! I've noted your interest in ${service}. Our specialist will contact you at ${phone} to provide detailed information and answer all your questions. 😊`,
    procedure_inquiry: "As a dental assistant, I cannot provide specific details about dental procedures. However, I can connect you with our specialist who can explain everything thoroughly. Would you like that?",
    contact_after_yes: "Great! I'll just need your name, phone number, and email to set this up. 😊",
    waiting_for_contact: "I'm ready to connect you with our specialist. Just share your name, phone number, and email, and I'll take care of the rest."
};

const isGreeting = (message) => {
    const normalizedMsg = message.toLowerCase().trim();
    return GREETINGS.some(greeting => normalizedMsg.includes(greeting)) && message.length < 20;
};

const isDentalProblem = (message) => {
    const normalizedMsg = message.toLowerCase().trim();
    
    // Check each category of dental problems
    for (const [category, keywords] of Object.entries(DENTAL_PROBLEMS)) {
        if (keywords.some(keyword => normalizedMsg.includes(keyword))) {
            return {
                isIssue: true,
                category,
                severity: category === 'emergency' ? 'high' : 'normal'
            };
        }
    }
    
    return { isIssue: false };
};

const handleServiceInquiry = async (message, context) => {
    const normalizedMessage = message.toLowerCase();
    const services = context.services || [];
    
    console.log('Handling service inquiry for message:', normalizedMessage);
    console.log('Available services:', JSON.stringify(services, null, 2));

    // Try to find a matching service from the database
    let matchingService = null;

    // First check for direct mentions (e.g., "interested in teeth whitening")
    for (const service of services) {
        if (!service || !service.name) continue;
        
        const serviceName = service.name.toLowerCase().replace(/\s+/g, ' ').trim();
        console.log('Checking service:', serviceName);

        // Direct match for "interested in X" format
        if (normalizedMessage.includes(`interested in ${serviceName}`)) {
            console.log('Found exact match for interested in:', service.name);
            matchingService = service;
            break;
        }

        // Match all words in the service name
        const serviceWords = serviceName.split(' ');
        const allWordsMatch = serviceWords.every(word => 
            normalizedMessage.includes(word.toLowerCase())
        );

        if (allWordsMatch) {
            console.log('Found all words match for:', service.name);
            matchingService = service;
            break;
        }
    }

    // If a specific service is found in the database
    if (matchingService) {
        console.log('Generating response for service:', matchingService.name);
        console.log('Service details:', JSON.stringify(matchingService, null, 2));
        
        // Get service description or use default
        const serviceDescription = matchingService.description || 
            `${matchingService.name} is one of our specialized dental services`;

        console.log('Using description:', serviceDescription);

        // Return service-specific response
        return {
            type: 'SERVICE_INQUIRY',
            detectedService: matchingService.name,
            serviceContext: matchingService.name,
            response: `${serviceDescription}\n\nWould you like to schedule a consultation with our ${matchingService.name} specialist? I can help arrange that. 😊`
        };
    }

    return null;
};

export const generateAIResponse = async (message, businessData, messageHistory = [], isNewSession = false) => {
    try {
        const normalizedMessage = message.toLowerCase();
        console.log('Generating response for message:', message);
        console.log('Business data:', JSON.stringify(businessData, null, 2));
        console.log('Message history:', JSON.stringify(messageHistory, null, 2));

        const lastUserMessage = messageHistory.filter(msg => msg.sender === 'user').pop();
        const lastBotMessage = messageHistory.filter(msg => msg.sender === 'bot').pop();

        // FIRST check for service inquiries - this takes priority
        if (normalizedMessage.includes('interested in') || 
            normalizedMessage.includes('about') || 
            normalizedMessage.includes('want')) {
            console.log('Detected explicit service interest, checking services...');
            const serviceInquiry = await handleServiceInquiry(message, businessData);
            if (serviceInquiry) {
                console.log('Explicit service inquiry response:', serviceInquiry);
                return serviceInquiry;
            }
        }

        // Handle follow-up questions after a problem was identified
        if (lastBotMessage?.type === 'DENTAL_PROBLEM' && 
            (normalizedMessage.includes('which service') || normalizedMessage.includes('what service') || 
             normalizedMessage.includes('can help') || normalizedMessage.includes('what should i do'))) {
            
            const problemCategory = lastBotMessage.problemCategory;
            console.log('Follow-up question detected for problem category:', problemCategory);

            let suggestedServices = [];
            if (problemCategory === 'damage') {
                suggestedServices = ['Dental Crowns', 'Dental Bonding', 'Veneers', 'Fillings'];
            } else if (problemCategory === 'pain') {
                suggestedServices = ['Root Canal Treatment', 'Tooth Extraction', 'Emergency Consultation'];
            } else if (problemCategory === 'sensitivity') {
                suggestedServices = ['Sensitivity Treatment', 'Fillings', 'Dental Sealants'];
            } // Add more mappings as needed
            
            const availableServices = businessData.services.map(s => s.name);
            const relevantServices = suggestedServices.filter(s => 
                availableServices.some(as => as.toLowerCase().includes(s.toLowerCase()))
            );

            if (relevantServices.length > 0) {
                return {
                    type: 'PROBLEM_FOLLOWUP',
                    response: `For concerns related to ${problemCategory}, we often recommend services like:\n${relevantServices.map(s => `• ${s}`).join('\n')}\n\nWould you like to learn more about one of these, or shall I help you schedule a consultation to determine the best approach?`
                };
            } else {
                // Fallback if no specific services match the suggestions
                 return {
                    type: 'PROBLEM_FOLLOWUP',
                    response: `Based on your concern about ${problemCategory}, it's best to have our specialist evaluate it. Would you like to schedule a consultation? I'll need your name, phone, and email.`
                };
            }
        }

        // Then check for contact information
        const contactInfo = extractContactInfo(message);
        if (contactInfo && contactInfo.name && contactInfo.phone && contactInfo.email) {
            return {
                type: 'CONTACT_INFO',
                response: RESPONSE_TEMPLATES.contact_confirmation(
                    contactInfo.name,
                    contactInfo.service || lastBotMessage?.detectedService || 'our dental services',
                    contactInfo.phone
                ),
                contactInfo,
                serviceContext: contactInfo.service || lastBotMessage?.detectedService
            };
        }

        // Handle "yes" responses when we're waiting for contact info
        const lastMessage = messageHistory[messageHistory.length - 1];
        if (lastMessage?.sender === 'bot' && 
            (normalizedMessage === 'yes' || normalizedMessage === 'sure' || normalizedMessage === 'okay' || normalizedMessage === 'ok')) {
            
            console.log('Detected confirmation (yes/sure/ok). Last bot message:', lastMessage.response);
            // Check if the bot asked a question that expects a confirmation to proceed with contact request
            if (lastMessage.response.includes('Would you like') || 
                lastMessage.response.includes('shall I help') || 
                lastMessage.response.includes('arrange that')) {
                
                // Avoid asking again if the bot *just* asked for details
                if (!lastMessage.response.includes('name, phone number, and email')) {
                    console.log('Responding with contact request template.');
                    return {
                        type: 'CONTACT_REQUEST',
                        response: RESPONSE_TEMPLATES.contact_request
                    };
                } else {
                    console.log('Last bot message already requested contact info, ignoring confirmation.');
                }
            } else {
                 console.log('Confirmation does not follow a relevant bot question, proceeding.');
            }
        }

        // Check for dental problems (initial report)
        const dentalProblem = isDentalProblem(message);
        if (dentalProblem.isIssue) {
            let responseTemplate;
            let concernDetail = dentalProblem.category;
            if (dentalProblem.severity === 'high') {
                responseTemplate = RESPONSE_TEMPLATES.emergency;
            } else if (dentalProblem.category === 'appearance') {
                responseTemplate = RESPONSE_TEMPLATES.visual_concern;
                // Try to extract the specific visual detail (e.g., "black dot")
                const appearanceKeywords = DENTAL_PROBLEMS.appearance;
                const mentionedKeyword = appearanceKeywords.find(k => normalizedMessage.includes(k));
                if (mentionedKeyword) {
                    // Try to get a slightly more specific phrase if possible
                    const regex = new RegExp(`(\w+\s+)?${mentionedKeyword}(\s+\w+)?`, 'i');
                    const match = normalizedMessage.match(regex);
                    concernDetail = match ? match[0] : mentionedKeyword; 
                } else {
                    concernDetail = 'visual change'; // Fallback detail
                }
            } else {
                responseTemplate = RESPONSE_TEMPLATES.dental_problem;
            }
            return {
                type: 'DENTAL_PROBLEM',
                response: typeof responseTemplate === 'function' ? responseTemplate(concernDetail) : responseTemplate,
                problemCategory: dentalProblem.category,
                severity: dentalProblem.severity
            };
        }

        // Handle initial greeting
        if (isNewSession || isGreeting(message)) {
            return {
                type: 'GREETING',
                response: RESPONSE_TEMPLATES.greeting
            };
        }

        // Check for general service inquiries (if not caught earlier)
        console.log('Checking general service inquiry...');
        const serviceInquiry = await handleServiceInquiry(message, businessData);
        if (serviceInquiry) {
            console.log('General service inquiry response:', serviceInquiry);
            return serviceInquiry;
        }

        // --- Check for request to list all services --- 
        const listServiceKeywords = [
            'list services', 'what services', 'which services', 'do you offer', 'your services',
            'list service', 'what service', 'which service' // Add singular variations
        ];
        const isListServiceRequest = listServiceKeywords.some(keyword => normalizedMessage.includes(keyword));
        
        if (isListServiceRequest && businessData.services && businessData.services.length > 0) {
            console.log('Request to list all services detected.');
            const serviceNames = businessData.services.map(s => `• ${s.name}`).join('\n');
            return {
                type: 'SERVICE_LIST', // New type for service list response
                response: `Here are the dental services we offer:\n\n${serviceNames}\n\nWould you like to learn more about any specific service, or can I help you schedule a consultation?`
            };
        }

        // --- OpenAI Fallback --- 
        console.log('Falling back to OpenAI generation.');
        
        // Prepare context for OpenAI
        const systemPrompt = `You are a dental office AI assistant. 
Persona Traits: ${CHATBOT_PERSONALITY.traits.join(', ')}. 
Rules: ${CHATBOT_PERSONALITY.rules.join(' ')}
Your goal is to understand the user's query, provide helpful acknowledgement, and gently guide them towards scheduling a consultation if their query isn't easily categorized as a specific service request, greeting, contact info provision, or known dental problem. Acknowledge their statement, explain that a dentist needs to evaluate specific conditions, and offer to help schedule an appointment. Do not give medical advice. Keep responses concise and friendly.`;

        const conversationHistory = messageHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.slice(-4), // Include last 4 messages for context
            { role: "user", content: message }
        ];

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Or your preferred model
                messages: messages,
                temperature: 0.7, // Adjust for creativity vs consistency
                max_tokens: 100,
            });

            const aiResponseContent = completion.choices[0]?.message?.content?.trim() || RESPONSE_TEMPLATES.understanding; // Fallback to template if generation fails
            console.log('OpenAI generated response:', aiResponseContent);

            return {
                type: 'AI_FALLBACK', // New type for AI generated fallback
                response: aiResponseContent
            };

        } catch (openaiError) {
            console.error("OpenAI API call failed:", openaiError);
            // Fallback to the simple understanding template if OpenAI fails
            return {
                type: 'ERROR_FALLBACK',
                response: RESPONSE_TEMPLATES.understanding 
            };
        }

    } catch (error) {
        console.error("Error generating AI response:", error);
        return {
            type: 'ERROR',
            response: "I apologize, but I'm having trouble understanding. Could you please rephrase that?"
        };
    }
};
