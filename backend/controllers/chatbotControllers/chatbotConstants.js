// Personality traits for consistent tone
export const CHATBOT_PERSONALITY = {
    traits: [
        "professional but warm",
        "empathetic and understanding",
        "knowledgeable about dental procedures (but not a dentist)",
        "helpful without being pushy",
        "takes serious dental concerns seriously",
        "goal is to schedule a consultation or gather contact info",
        "never give medical advice",
        
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
export const GREETINGS = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'hi there', 'hello there', 'greetings'
];

// Dental problem indicators
export const DENTAL_PROBLEMS = {
    pain: ['pain', 'hurt', 'ache', 'hurts', 'hurting', 'aching', 'painful',],
    sensitivity: ['sensitive', 'sensitivity', 'cold', 'hot', 'sweet',],
    damage: ['broken', 'chipped', 'cracked', 'loose', 'missing'],
    emergency: ['bleeding', 'swollen', 'swelling', 'infection', 'abscess'],
    appearance: ['dot', 'spot', 'stain', 'discoloration', 'black', 'white', 'yellow', 'brown', 'dark', 'white spot', 'whiteish spot', 'whiteish stain', 'whiteish discoloration', 'something '],
    
};

// Common response templates
export const RESPONSE_TEMPLATES = {
    greeting: "👋 Hello! I'm here to help you learn about our dental services and find the perfect treatment for your needs. How can I assist you today?",
    understanding: "I understand you're interested in learning more about this. As a dental assistant, I want to ensure you get the most accurate information.\n\n👩‍⚕️ Would you like me to connect you with our specialist who can provide detailed information about this procedure?",
    contact_request: "Perfect! To connect you with our specialist, could you please provide your full name, phone number, and email address? 😊",
    emergency: "I understand this is an emergency that needs immediate attention! Let me help you get an urgent appointment.\n\n📞 Please provide your full name, phone number, and email address, and our emergency team will contact you immediately. We prioritize these cases!",
    dental_problem: (problem) => `I understand your concern about ${problem}. This should be evaluated by our dental team.\n\n📞 To help schedule a consultation, could you please provide your full name, phone number, and email address?`,
    visual_concern: (concern) => `Okay, I understand you've noticed a ${concern} on your tooth. It's best to have our dental team evaluate that.\n\n📞 To help schedule a consultation, could you please provide your full name, phone number, and email address?`,
    service_inquiry: (service) => `Our specialist can provide detailed information about ${service}. To arrange this, could you please provide your full name, phone number, and email address?`,
    // Note: contact_confirmation logic was moved directly into generateAIResponse, 
    // but keeping template key here might be useful if you decide to revert later.
    contact_confirmation_template: (name, service, phone) => 
        `✅ Thank you ${name}! I've noted your interest in ${service}. Our specialist will contact you at ${phone} to provide detailed information and answer all your questions. 😊`,
    procedure_inquiry: "As a dental assistant, I cannot provide specific details about dental procedures. However, I can connect you with our specialist who can explain everything thoroughly. Would you like that?",
    contact_after_yes: "Great! I'll just need your full name, phone number, and email address to set this up. 😊",
    waiting_for_contact: "I'm ready to connect you with our specialist. Just share your full name, phone number, and email address, and I'll take care of the rest.",
    service_list_prefix: "Here are the dental services we offer:\n\n",
    service_list_suffix: "\n\nWould you like to learn more about any specific service, or can I help you schedule a consultation?",
    problem_followup_prefix: (category) => `For concerns related to ${category}, we often recommend services like:\n`,
    problem_followup_suffix: "\n\nWould you like to learn more about one of these, or shall I help you schedule a consultation to determine the best approach?",
    problem_followup_fallback: (category) => `Based on your concern about ${category}, it's best to have our specialist evaluate it. Would you like to schedule a consultation? I'll need your name, phone, and email.`,
    error_fallback: "I apologize, but I'm having trouble understanding. Could you please rephrase that?",
    api_error_fallback: "I apologize, but I'm having trouble accessing our service information right now. Would you like to share your name, phone number, and email so our team can reach out to you directly?"
};

// --- Keywords --- 

// Keywords indicating a dental problem (used by controller override logic)
export const DENTAL_KEYWORDS_FOR_TRACKING = [
    'pain', 'hurt', 'ache', 'sensitive', 'broken', 'chipped', 
    'bleeding', 'swollen', 'cavity', 'tooth', 'teeth', 'gum',
    'wisdom', 'crown', 'filling', 'root canal', 'cleaning',
    'implant', 'denture', 'bridge', 'extraction'
];

// Keywords indicating a booking/scheduling request
export const BOOKING_KEYWORDS = [
    'schedule', 'appointment', 'book', 'booking', 'reserve',
    'slot', 'time', 'available', 'availability', 'when can'
];

// Keywords indicating a rescheduling request
export const RESCHEDULE_KEYWORDS = [
    'reschedule', 'change appointment', 'move appointment',
    'different time', 'another time', 'change my appointment',
    'switch appointment', 'postpone'
];

// Keywords indicating a cancellation request
export const CANCEL_KEYWORDS = [
    'cancel', 'cancelation', 'cancellation', 'delete appointment',
    'remove appointment', 'drop appointment'
];

// Keywords indicating an urgent request
export const URGENT_KEYWORDS = [
    'urgent', 'emergency', 'severe', 'extreme', 'asap',
    'right away', 'immediate', 'today', 'as soon as possible',
    'terrible pain', 'severe pain', 'unbearable', 'emergency slot'
];

// Keywords indicating a request for advice
export const ADVICE_KEYWORDS = [
    'tips', 'advice', 'recommend', 'suggestion', 'guide',
    'how to', 'what should', 'best way', 'help with',
    'tell me about', 'information about', 'learn about'
];

// Keywords for identifying specific health questions
export const SPECIFIC_HEALTH_QUESTIONS = [
    { keywords: ['food', 'eat', 'diet', 'drink', 'avoid', 'prevent', 'cavities'], 
        topic: 'dietary recommendations' },
    { keywords: ['brush', 'brushing', 'floss', 'flossing', 'clean', 'cleaning'], 
        topic: 'oral hygiene practices' },
    { keywords: ['whitening', 'white', 'stain', 'yellow', 'bright', 'color'], 
        topic: 'teeth whitening' },
    { keywords: ['sensitive', 'sensitivity', 'cold', 'hot', 'sweet'], 
        topic: 'tooth sensitivity' },
    { keywords: ['bad breath', 'breath', 'halitosis', 'smell'], 
        topic: 'breath freshness' },
    { keywords: ['child', 'children', 'kid', 'kids', 'baby', 'toddler', 'pediatric', 'grow'],
        topic: 'pediatric dental care' },
    { keywords: ['crown', 'crowns', 'cap', 'caps', 'broken tooth', 'damaged tooth'],
        topic: 'dental crowns' },
    { keywords: ['implant', 'implants', 'artificial tooth', 'replacement tooth'],
        topic: 'dental implants' },
    { keywords: ['veneer', 'veneers', 'cosmetic', 'smile makeover'],
        topic: 'cosmetic dentistry' },
    { keywords: ['root canal', 'root treatment', 'infected tooth'],
        topic: 'root canal treatment' }
];

// Keywords for checking if message is about specific treatment options
export const SPECIFIC_SERVICE_QUESTION_KEYWORDS = [
    'options', 'what', 'how', 'need', 'should'
];

// Keywords indicating a pediatric context
export const PEDIATRIC_KEYWORDS = [
    'child', 'children', 'kid', 'kids', 'baby', 'toddler', 'pediatric', 'grow'
]; 