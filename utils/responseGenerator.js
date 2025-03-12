const TEMPLATES = {
    PRICE: {
        INITIAL: (service, pricing) => 
            `For ${service}, the investment typically ranges from ${pricing.range}. This includes ${pricing.features}. We offer flexible payment plans starting at $199/month.`,
        FOLLOW_UP: (service) => 
            `To get your personalized quote for ${service} and learn about our current offers, please share your name, phone number, and email address.`
    },
    INTEREST: {
        INITIAL: (service, info) =>
            `Great! ${service} are an excellent choice for transforming your smile. They are ${info.description} that ${info.benefits}. The investment ranges from ${info.pricing.range}, and we offer flexible payment plans.`,
        FOLLOW_UP: () =>
            `Would you like to schedule a consultation? Just share your name, phone number, and email address, and we'll help you get started.`
    }
    // ... rest of templates
};

export function generateResponse(memory, serviceInfo, questionType) {
    const service = memory.currentService;
    if (!service || !serviceInfo[service]) {
        return TEMPLATES.FALLBACK();
    }

    const info = serviceInfo[service];
    const serviceContext = memory.serviceContext[service];

    // Check if this is a direct price question or general interest
    if (questionType === 'price') {
        return `${TEMPLATES.PRICE.INITIAL(service, info.pricing)} ${TEMPLATES.PRICE.FOLLOW_UP(service)}`;
    } else if (memory.messageHistory[memory.messageHistory.length - 1].message.toLowerCase().includes('interested')) {
        return `${TEMPLATES.INTEREST.INITIAL(service, info)} ${TEMPLATES.INTEREST.FOLLOW_UP()}`;
    }
    // ... rest of the function
} 