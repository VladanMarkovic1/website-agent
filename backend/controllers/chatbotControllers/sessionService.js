import ChatSession from '../../models/ChatSession.js'; // Import the Mongoose model

const MAX_MESSAGES = 20; // Limit the number of messages stored per session

// --- No longer using setInterval for cleanup; relying on TTL index --- 
// // Run cleanup periodically (e.g., every hour)
// // setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
// // console.log('[SessionService] Session cleanup interval started.');

/**
 * Retrieves a session by its ID from MongoDB, creating a new one if it doesn't exist.
 * Updates the lastActivity timestamp.
 * 
 * @param {string} sessionId 
 * @param {string} businessId 
 * @returns {Promise<{session: Object, isNew: boolean}>} The session document and a flag indicating if it was newly created.
 */
export const getOrCreateSession = async (sessionId, businessId) => {
    try {
        let session = await ChatSession.findOne({ sessionId });

        if (!session) {
            // console.log(`[SessionService-DB] Creating new session for ID: ${sessionId}`); // Keep commented
            session = new ChatSession({ 
                sessionId, 
                businessId, 
                lastInteractionTime: Date.now(),
                messages: [], // Initialize messages array
                isFirstMessage: true
            });
            await session.save();
        } else {
            // console.log(`[SessionService-DB] Retrieved existing session for ID: ${sessionId}`); // Keep commented
            // Update last interaction time on retrieval
            session.lastInteractionTime = Date.now();
            await session.save(); 
        }
        return { session, isNew: !session }; // Simplified return
    } catch (error) {
        console.error(`[SessionService-DB] Error in getOrCreateSession for ID ${sessionId}:`, error); // Keep error log
        throw error; // Re-throw error to be handled by caller
    }
};

/**
 * Updates specific data within an existing session in MongoDB.
 * 
 * @param {string} sessionId 
 * @param {Object} dataToUpdate - An object with key-value pairs to update.
 * @returns {Promise<void>}
 */
export const updateSessionData = async (sessionId, dataToUpdate) => {
    try {
        // Always update lastInteractionTime when updating data
        const updatePayload = { ...dataToUpdate, lastInteractionTime: Date.now() };
        const result = await ChatSession.updateOne({ sessionId }, { $set: updatePayload });
        // console.log(`[SessionService-DB] Updated session data for ID: ${sessionId}`, dataToUpdate); // Keep commented
        if (result.matchedCount === 0) {
            throw new Error(`Session not found for update: ${sessionId}`);
        }
    } catch (error) {
        console.error(`[SessionService-DB] Error updating session data for ID ${sessionId}:`, error); // Keep error log
        throw error;
    }
};

/**
 * Adds messages to the session history in MongoDB, maintaining a limit.
 * 
 * @param {string} sessionId 
 * @param {Object} userMessage 
 * @param {Object} botMessage 
 * @returns {Promise<void>}
 */
export const addMessagesToSession = async (sessionId, userMessage, botMessage) => {
    try {
        // Ensure messages are pushed in the correct order
        const result = await ChatSession.updateOne(
            { sessionId }, 
            {
                $push: {
                    messages: { $each: [userMessage, botMessage] } 
                },
                $set: { lastInteractionTime: Date.now() } // Also update interaction time here
            }
        );
        if (result.matchedCount === 0) {
            throw new Error(`Session not found for adding messages: ${sessionId}`);
        }
    } catch (error) {
        console.error(`[SessionService-DB] Error adding messages to session ID ${sessionId}:`, error); // Keep error log
        throw error;
    }
};

// --- Manual cleanup function (if not using TTL or for specific needs) ---
// const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
// export const cleanupExpiredSessions = async () => {
//     try {
//         const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
//         console.log(`[SessionService-DB] Cleaning up sessions older than ${cutoff.toISOString()}`);
//         const result = await ChatSession.deleteMany({ lastActivity: { $lt: cutoff } });
//         if (result.deletedCount > 0) {
//             console.log(`[SessionService-DB] Deleted ${result.deletedCount} expired sessions.`);
//         }
//     } catch (error) {
//         console.error('[SessionService-DB] Error during session cleanup:', error);
//     }
// };

// Optional: Function to manually get a session without creating it
// Might be useful for debugging or specific checks
export const getSession = async (sessionId) => {
    try {
        return await ChatSession.findOne({ sessionId });
    } catch (error) {
        console.error(`[SessionService-DB] Error fetching session ID ${sessionId}:`, error); // Keep error log
        throw error;
    }
}; 