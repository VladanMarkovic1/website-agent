// Store conversation data in memory
const conversationMemory = {};
const affirmativeResponses = ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'yup', 'definitely', 'absolutely'];

// Initialize or get session memory
export function getSessionMemory(businessId) {
    if (!conversationMemory[businessId]) {
        conversationMemory[businessId] = {
            currentService: null,
            mentionedServices: [],
            lastQuestion: null,
            messageHistory: [],
            context: {
                priceAsked: false,
                introductionGiven: false,
                timelineDiscussed: false,
                bookingAttempted: false
            },
            serviceContext: {}
        };
    }
    return conversationMemory[businessId];
}

// Update session memory with new information
export function updateSessionMemory(businessId, message, detectedService) {
    const memory = getSessionMemory(businessId);
    const lowercaseMsg = message.toLowerCase();

    // Check for affirmative response
    if (affirmativeResponses.includes(lowercaseMsg) && memory.lastQuestion) {
        const previousQuestion = memory.lastQuestion;
        memory.lastQuestion = 'booking';
        
        memory.messageHistory.push({
            message,
            timestamp: new Date(),
            isUser: true,
            service: memory.currentService,
            context: {
                wasAffirmative: true,
                previousQuestion
            }
        });
        
        return memory;
    }

    // Store message with context
    memory.messageHistory.push({
        message,
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

    // Update service tracking
    if (detectedService) {
        memory.currentService = detectedService;
        if (!memory.mentionedServices.includes(detectedService)) {
            memory.mentionedServices.push(detectedService);
        }
        
        // Initialize service-specific context
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
    updateQuestionContext(memory, lowercaseMsg, detectedService);

    return memory;
}

// Get relevant previous messages about a service
export function getPreviousServiceInfo(memory, service) {
    if (!memory.messageHistory) return null;

    const relevantMessages = memory.messageHistory
        .filter(msg => msg.service === service)
        .slice(-3); // Get last 3 relevant messages

    return relevantMessages.length > 0 ? relevantMessages : null;
}

// Helper function to update question context
function updateQuestionContext(memory, lowercaseMsg, detectedService) {
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
}

// Clean up session data
export function cleanupSession(businessId) {
    delete conversationMemory[businessId];
}

// Store bot response in memory
export function storeBotResponse(businessId, response, service) {
    const memory = getSessionMemory(businessId);
    memory.messageHistory.push({
        message: response,
        timestamp: new Date(),
        isUser: false,
        service: service || memory.currentService
    });
    return memory;
}