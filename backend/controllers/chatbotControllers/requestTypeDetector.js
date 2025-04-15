import {
    BOOKING_KEYWORDS,
    RESCHEDULE_KEYWORDS,
    CANCEL_KEYWORDS,
    URGENT_KEYWORDS,
    ADVICE_KEYWORDS,
    SPECIFIC_HEALTH_QUESTIONS,
    PEDIATRIC_KEYWORDS,
    SPECIFIC_SERVICE_QUESTION_KEYWORDS
} from './chatbotConstants.js';

/**
 * Checks if the message indicates a booking request.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkBookingRequest = (normalizedMessage) => {
    return BOOKING_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Checks if the message indicates a reschedule request.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkRescheduleRequest = (normalizedMessage) => {
    return RESCHEDULE_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Checks if the message indicates a cancellation request.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkCancelRequest = (normalizedMessage) => {
    return CANCEL_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Checks if the message indicates an urgent request.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkUrgentRequest = (normalizedMessage) => {
    const urgentKeywordMatch = URGENT_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
    const severePainMatch = normalizedMessage.includes('pain') && 
                            (normalizedMessage.includes('bad') || 
                             normalizedMessage.includes('severe') || 
                             normalizedMessage.includes('lot of'));
    return urgentKeywordMatch || severePainMatch;
};

/**
 * Checks if the message indicates a request for general advice.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkAdviceRequest = (normalizedMessage) => {
    return ADVICE_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Checks if the message relates to pediatric dental care.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkPediatricQuestion = (normalizedMessage) => {
    return PEDIATRIC_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Checks if the message asks about specific service/treatment options.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {boolean}
 */
export const checkSpecificServiceQuestion = (normalizedMessage) => {
    return SPECIFIC_SERVICE_QUESTION_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
};

/**
 * Tries to match the message against specific health question keywords.
 * @param {string} normalizedMessage - Lowercased, trimmed message.
 * @returns {Object|null} The matched question object (with topic) or null.
 */
export const matchHealthQuestion = (normalizedMessage) => {
    return SPECIFIC_HEALTH_QUESTIONS.find(q => 
        q.keywords.some(keyword => normalizedMessage.includes(keyword))
    );
};

/**
 * Bundles all request type checks into one function for convenience.
 * @param {string} message - The original user message.
 * @returns {Object} An object containing boolean flags for each request type.
 */
export const detectRequestTypes = (message) => {
    const normalizedMessage = message.toLowerCase().trim();
    const matchedQuestion = matchHealthQuestion(normalizedMessage);
    const isSpecificServiceQuestion = checkSpecificServiceQuestion(normalizedMessage);

    return {
        isBookingRequest: checkBookingRequest(normalizedMessage),
        isRescheduleRequest: checkRescheduleRequest(normalizedMessage),
        isCancelRequest: checkCancelRequest(normalizedMessage),
        isUrgentRequest: checkUrgentRequest(normalizedMessage),
        isAdviceRequest: checkAdviceRequest(normalizedMessage),
        isPediatricQuestion: checkPediatricQuestion(normalizedMessage),
        isSpecificServiceQuestion: isSpecificServiceQuestion,
        matchedQuestion: matchedQuestion,
        // Combined flag used in override logic
        isPotentiallyOverridingRequest: (
            checkBookingRequest(normalizedMessage) ||
            checkRescheduleRequest(normalizedMessage) ||
            checkCancelRequest(normalizedMessage) ||
            checkUrgentRequest(normalizedMessage) ||
            checkAdviceRequest(normalizedMessage) ||
            (matchedQuestion && isSpecificServiceQuestion)
        )
    };
}; 