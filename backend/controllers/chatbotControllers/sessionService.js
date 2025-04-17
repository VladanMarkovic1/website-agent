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
        const now = new Date();
        let isNew = false;

        // Find and update the lastActivity in one go
        let session = await ChatSession.findOneAndUpdate(
            { sessionId },
            { $set: { lastActivity: now } }, 
            { new: true } // Return the updated document
        );

        if (!session) {
            console.log(`[SessionService-DB] Creating new session for ID: ${sessionId}`);
            isNew = true;
            session = await ChatSession.create({
                sessionId,
                businessId,
                lastActivity: now, // Set initial activity time
                messages: [],
                // Default fields are set by the schema
            });
        } else {
            console.log(`[SessionService-DB] Retrieved existing session for ID: ${sessionId}`);
        }
        
        // Return a plain object if needed, or the Mongoose doc
        return { session: session.toObject ? session.toObject() : session, isNew }; 
    } catch (error) {
        console.error(`[SessionService-DB] Error in getOrCreateSession for ID ${sessionId}:`, error);
        throw new Error('Failed to get or create chat session.'); // Re-throw a generic error
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
        const updatePayload = { 
            $set: { 
                ...dataToUpdate,
                lastActivity: new Date() // Always update activity timestamp
            }
        };
        
        const result = await ChatSession.updateOne({ sessionId }, updatePayload);
        
        if (result.matchedCount === 0) {
            console.warn(`[SessionService-DB] Attempted to update non-existent session ID: ${sessionId}`);
        } else {
             console.log(`[SessionService-DB] Updated session data for ID: ${sessionId}`, dataToUpdate);
        }
    } catch (error) {
        console.error(`[SessionService-DB] Error updating session data for ID ${sessionId}:`, error);
        // Decide if you need to throw here or just log
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
        const updatePayload = {
            $push: {
                messages: {
                    $each: [userMessage, botMessage],
                    $slice: -MAX_MESSAGES // Keep only the last MAX_MESSAGES
                }
            },
            $set: { lastActivity: new Date() } // Update activity timestamp
        };

        const result = await ChatSession.updateOne({ sessionId }, updatePayload);
        
        if (result.matchedCount === 0) {
             console.warn(`[SessionService-DB] Attempted to add messages to non-existent session ID: ${sessionId}`);
        }
    } catch (error) {
         console.error(`[SessionService-DB] Error adding messages to session ID ${sessionId}:`, error);
         // Decide if you need to throw here or just log
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
        const session = await ChatSession.findOne({ sessionId });
        return session ? (session.toObject ? session.toObject() : session) : null;
    } catch (error) {
        console.error(`[SessionService-DB] Error fetching session ID ${sessionId}:`, error);
        return null;
    }
}; 