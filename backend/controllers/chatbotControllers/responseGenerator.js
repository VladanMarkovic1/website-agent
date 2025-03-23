/**
 * Generates responses based on conversation memory and service information
 */

// Response templates for different scenarios
const TEMPLATES = {
    PRICE: {
        INITIAL: (service, pricing) => 
            `For ${service}, the investment typically ranges from ${pricing.range}. This includes ${pricing.features}. We offer flexible payment plans starting at $199/month.`,
        FOLLOW_UP: (service) => 
            `To get your personalized quote for ${service} and learn about our current offers, please share your name, phone number, and email address.`
    },
    INTRODUCTION: {
        STANDARD: (service, info) => 
            `At Revive Dental, we offer high-quality ${service.toLowerCase()} that are ${info.description} designed to ${info.benefits}. Our expert team ensures ${info.features}, and the result is a beautiful and natural-looking outcome.`,
        WITH_TIMELINE: (info) => 
            ` The treatment typically takes ${info.timeline}.`,
        WITH_PRICING: () => 
            ` We offer flexible payment plans starting at $199/month.`
    },
    TIMELINE: {
        INITIAL: (service, info) => 
            `For ${service}, the complete treatment typically takes ${info.timeline}. During this time, we'll ensure ${info.features} for the best results.`,
        WITH_PRICE: (pricing) => 
            ` The investment ranges from ${pricing.range}, and we're currently offering special financing options.`
    },
    BOOKING: {
        INITIAL: (service) => 
            `Excellent! Let's schedule your ${service.toLowerCase()} consultation right away.`,
        DETAILS: () => 
            ` During your consultation, our expert team will:\n1. Evaluate your specific needs\n2. Create a personalized treatment plan\n3. Discuss financing options starting at $199/month\n4. Answer all your questions about the procedure`
    },
    CONTACT_REQUEST: () =>
        `Please share your name, phone number, and email address so we can get in touch with you about this.`,
    FALLBACK: () =>
        `I'd be happy to help you with that. Could you please provide more details about what you're looking for?`
};

/**
 * Generates a response based on conversation context
 */
export function generateResponse(memory, serviceInfo, questionType) {
    const service = memory.currentService;
    if (!service || !serviceInfo[service]) {
        return TEMPLATES.FALLBACK();
    }

    const info = serviceInfo[service];
    const serviceContext = memory.serviceContext[service];
    let response = '';

    switch (questionType) {
        case 'price':
            response = generatePriceResponse(service, info, serviceContext);
            break;
        case 'introduction':
            response = generateIntroResponse(service, info, serviceContext);
            break;
        case 'timeline':
            response = generateTimelineResponse(service, info, serviceContext);
            break;
        case 'booking':
            response = generateBookingResponse(service, info, serviceContext);
            break;
        default:
            response = generateContextualResponse(service, info, memory);
    }

    return response;
}

function generatePriceResponse(service, info, serviceContext) {
    let response = TEMPLATES.PRICE.INITIAL(service, info.pricing);
    
    if (!serviceContext.contactRequested) {
        response += ' ' + TEMPLATES.PRICE.FOLLOW_UP(service);
    }
    
    return response;
}

function generateIntroResponse(service, info, serviceContext) {
    let response = TEMPLATES.INTRODUCTION.STANDARD(service, info);
    
    if (serviceContext.timelineDiscussed) {
        response += TEMPLATES.INTRODUCTION.WITH_TIMELINE(info);
    }
    
    if (serviceContext.priceAsked) {
        response += TEMPLATES.INTRODUCTION.WITH_PRICING();
    }
    
    return response;
}

function generateTimelineResponse(service, info, serviceContext) {
    let response = TEMPLATES.TIMELINE.INITIAL(service, info);
    
    if (serviceContext.priceAsked) {
        response += TEMPLATES.TIMELINE.WITH_PRICE(info.pricing);
    }
    
    return response;
}

function generateBookingResponse(service, info, serviceContext) {
    let response = TEMPLATES.BOOKING.INITIAL(service);
    response += TEMPLATES.BOOKING.DETAILS();
    
    if (!serviceContext.contactRequested) {
        response += '\n\n' + TEMPLATES.CONTACT_REQUEST();
    }
    
    return response;
}

function generateContextualResponse(service, info, memory) {
    const previousMessages = memory.messageHistory.slice(-3);
    const hasRecentPriceQuestion = previousMessages.some(msg => 
        msg.context?.priceAsked
    );
    
    let response = TEMPLATES.INTRODUCTION.STANDARD(service, info);
    
    if (hasRecentPriceQuestion) {
        response += TEMPLATES.INTRODUCTION.WITH_PRICING();
    }
    
    response += '\n\n' + TEMPLATES.CONTACT_REQUEST();
    
    return response;
}

/**
 * Generates a fallback response when no service is detected
 */
export function generateFallbackResponse(availableServices) {
    return `I can help you with any of our services including ${availableServices.join(', ')}. Which service would you like to know more about?`;
}