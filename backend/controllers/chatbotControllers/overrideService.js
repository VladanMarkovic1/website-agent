/**
 * Applies overrides to the initial AI response based on detected request types and session state.
 * 
 * @param {Object} initialResponse - The response object from generateAIResponse.
 * @param {Object} requestTypes - The object containing boolean flags for request types from detectRequestTypes.
 * @param {Object} session - The current user session object.
 * @param {Object} businessData - The business data object.
 * @returns {Object} The final response payload, potentially overridden.
 */
export const applyResponseOverrides = (initialResponse, requestTypes, session, businessData) => {
    const { 
        normalizedMessage,
        isBookingRequest,
        isRescheduleRequest,
        isCancelRequest,
        isUrgentRequest,
        isAdviceRequest,
        isPediatricQuestion,
        isSpecificServiceQuestion,
        matchedQuestion,
        isPotentiallyOverridingRequest
    } = requestTypes;

    //console.log('[DEBUG][overrideService.js] Initial response:', initialResponse?.type, initialResponse?.response);

    let finalResponse = { ...initialResponse }; // Start with the initial response

    // Prevent override if the required tip is already present in the response
    const requiredTip = "Just so you know, I don't have access to a live calendar to confirm real-time availability. However, I can arrange for our team to call you and finalize your appointment.";
    if (
        (finalResponse.type === 'APPOINTMENT_REQUEST' || finalResponse.type === 'BOOKING_REQUEST' || finalResponse.type === 'APPOINTMENT_REQUEST_DETAILED') &&
        finalResponse.response && finalResponse.response.includes(requiredTip)
    ) {
        return finalResponse;
    }

    // Check if an override is potentially needed (keywords match AND no contact info yet)
    const needsOverrideCheck = isPotentiallyOverridingRequest && !session.contactInfo;
    
    // Define initial types that indicate the conversation is already on a booking/contact track
    const bookingOrContactTypes = [
        'DENTAL_PROBLEM', // Already asking for contact
        'CONTACT_INFO_PROVIDED', // Already provided
        'APPOINTMENT_REQUEST', // Generic booking request (before details extracted)
        'APPOINTMENT_REQUEST_DETAILED', // Booking request with details (after extraction)
        'CONTACT_REQUEST', // Bot explicitly asked for contact
        'PARTIAL_CONTACT_REQUEST' // Bot asking for missing pieces
        // Add any other relevant types here
    ];

    // Apply override only if needed AND the initial response wasn't already handling booking/contact effectively
    if (needsOverrideCheck && !bookingOrContactTypes.includes(initialResponse.type)) {
        // console.log(`[OverrideService] Override check triggered. Initial type: ${initialResponse.type} is not in booking/contact list.`); // Debug only
        
        // --- Specific Overrides ---
        if (isBookingRequest && session.serviceInterest && initialResponse.type !== 'BOOKING_SPECIFIC_SERVICE') {
            finalResponse.response = `Okay, I can help you start the process to book an appointment for ${session.serviceInterest}. To connect you with our scheduling specialist, could you please provide your full name, phone number, and email address? They will then contact you to find a suitable time.`;
            finalResponse.type = 'BOOKING_SPECIFIC_SERVICE';
            // console.log('[OverrideService] Overriding with: BOOKING_SPECIFIC_SERVICE'); // Debug only
        } 
        else if (isPediatricQuestion) { 
            finalResponse.response = 
                `👶 As a dental receptionist, I understand you're asking about children's dental care. This is a crucial topic that our pediatric dental specialists would be happy to discuss in detail with you.\n\n` +
                `They can provide personalized guidance based on your child's age and specific needs.\n\n` +
                `📞 Could you please share your full name, phone number, and email address? Once you do, I'll have our pediatric dental team reach out to schedule a consultation where they can provide comprehensive information about your child's dental care journey and answer all your questions.`;
            finalResponse.type = 'PEDIATRIC_ADVICE_REQUEST';
            // Note: We might want to return the serviceInterest to be set in the session by the controller
            finalResponse.serviceContext = 'Pediatric Dentistry'; 
            // console.log('[OverrideService] Overriding with: PEDIATRIC_ADVICE_REQUEST'); // Debug only
        } 
        else if (matchedQuestion && isSpecificServiceQuestion && initialResponse.type !== 'AI_FALLBACK') { 
            finalResponse.response = `As a dental receptionist, I'd be happy to connect you with our specialist who can explain all the options available for ${matchedQuestion.topic} and help determine the best treatment plan for your specific needs.\n\nCould you please share your full name, phone number, and email address? Once you do, I'll have our dental team reach out to schedule a consultation where they can provide detailed information about ${matchedQuestion.topic} and answer all your questions.`;
            finalResponse.type = 'SPECIFIC_SERVICE_REQUEST';
            finalResponse.serviceContext = matchedQuestion.topic;
            // console.log('[OverrideService] Overriding with: SPECIFIC_SERVICE_REQUEST (and initial type was not AI_FALLBACK)'); // Debug only
        } 
        else if ((matchedQuestion || isAdviceRequest) && initialResponse.type !== 'AI_FALLBACK') { 
            const topic = matchedQuestion ? matchedQuestion.topic : 'dental health';
            finalResponse.response = ` 🦷 As a dental receptionist, I cannot provide specific advice about ${topic}, as this requires a professional evaluation from our dental team.\n\nHowever, I'd be happy to connect you with our specialist who can provide personalized recommendations. 📞 Could you please share your full name, phone number, and email address? Once you do, I'll make sure our dental team reaches out to schedule a consultation where they can address all your questions about ${topic}.`;
            finalResponse.type = 'SPECIFIC_ADVICE_REQUEST';
            // console.log('[OverrideService] Overriding with: SPECIFIC_ADVICE_REQUEST (and initial type was not AI_FALLBACK)'); // Debug only
        } 
        else if (isUrgentRequest) {
            const businessPhone = businessData?.businessPhoneNumber;
            const emergencyMessage = businessPhone
                ? `\n\nIf you're experiencing severe pain, you can also reach our emergency line directly at ${businessPhone}.`
                : `\n\nIf you're experiencing severe pain, please call our office immediately.`;
            finalResponse.response = `🦷 I understand you're experiencing urgent dental needs. Our team prioritizes emergency cases and will contact you as soon as possible.\n\n📞 To help you immediately, please provide your full name, phone number, and email address. Once you share these details, our emergency team will reach out to you right away to provide immediate assistance.${emergencyMessage}`;
            finalResponse.type = 'URGENT_REQUEST';
            // console.log('[OverrideService] Overriding with: URGENT_REQUEST'); // Debug only
        } 
        else if (isRescheduleRequest) {
            finalResponse.response = " ⏰ I understand you'd like to reschedule your appointment. To help you with this, I'll need your full name, phone number, and email address. This way, our scheduling team can locate your existing appointment and help find a new time that works better for you. Could you please provide these details?";
            finalResponse.type = 'RESCHEDULE_REQUEST';
            // console.log('[OverrideService] Overriding with: RESCHEDULE_REQUEST'); // Debug only
        } 
        else if (isCancelRequest) {
            finalResponse.response = " ❌ I understand you\'d like to cancel your appointment. To help you with this, I\'ll need your full name, phone number, and email address so our team can locate your appointment in the system. Could you please share these details with me?";
            finalResponse.type = 'CANCEL_REQUEST';
            // console.log('[OverrideService] Overriding with: CANCEL_REQUEST'); // Debug only
        } 
        else if (isBookingRequest) { 
            const messageToCheck = normalizedMessage || ''; 
            const isLikelyQuestion = /^(can|will|do|is|are|how|what|why)\b/.test(messageToCheck) || messageToCheck.endsWith('?');

            if (isLikelyQuestion) {
                // console.log('[OverrideService] Booking keyword detected, but message is a question. Skipping override.'); // Debug only
            } else {
                finalResponse.response = " ⏰ I'll be happy to help you schedule an appointment! 📞 To connect you with our scheduling specialist, I just need your full name, phone number, and email address. Once you provide these details, they will reach out to find the perfect time slot for you. Could you please share those details with me?";
                finalResponse.type = 'BOOKING_REQUEST';
                // console.log('[OverrideService] Overriding with: BOOKING_REQUEST (Generic)'); // Debug only
            }
        } else {
             // console.log('[OverrideService] Override check passed, but no specific override condition met. Keeping original response type:', initialResponse.type); // Debug only
        }
    } else {
         // console.log(`[OverrideService] Override check skipped. NeedsOverride: ${needsOverrideCheck}, Initial Type: ${initialResponse.type}`); // Debug only
    }

    //console.log('[DEBUG][overrideService.js] Final response:', finalResponse?.type, finalResponse?.response);
    return finalResponse;
}; 