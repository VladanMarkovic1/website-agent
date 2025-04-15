// In-memory session storage
const sessions = new Map();

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Removes expired sessions from the in-memory storage.
 */
const cleanupSessions = () => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        console.log(`[SessionService] Cleaned up ${deletedCount} expired sessions.`);
    }
};

// Run cleanup periodically (e.g., every 5 minutes)
setInterval(cleanupSessions, 5 * 60 * 1000);
console.log('[SessionService] Session cleanup interval started.');

/**
 * Retrieves a session by its ID, creating a new one if it doesn't exist.
 * Also updates the lastActivity timestamp for the retrieved/created session.
 * 
 * @param {string} sessionId 
 * @param {string} businessId 
 * @returns {{session: Object, isNew: boolean}} The session object and a flag indicating if it was newly created.
 */
export const getOrCreateSession = (sessionId, businessId) => {
    let session = sessions.get(sessionId);
    let isNew = false;
    
    if (!session) {
        console.log(`[SessionService] Creating new session for ID: ${sessionId}`);
        session = {
            messages: [],
            lastActivity: Date.now(),
            businessId,
            contactInfo: null,
            serviceInterest: null,
            isFirstMessage: true,
            problemDescription: null
        };
        sessions.set(sessionId, session);
        isNew = true;
    } else {
        console.log(`[SessionService] Retrieved existing session for ID: ${sessionId}`);
        // Update activity timestamp on retrieval
        session.lastActivity = Date.now();
    }
    return { session, isNew };
};

/**
 * Updates specific data within an existing session.
 * 
 * @param {string} sessionId 
 * @param {Object} dataToUpdate - An object with key-value pairs to update in the session.
 */
export const updateSessionData = (sessionId, dataToUpdate) => {
    const session = sessions.get(sessionId);
    if (session) {
        Object.assign(session, dataToUpdate);
        session.lastActivity = Date.now(); // Also update activity on data update
        console.log(`[SessionService] Updated session data for ID: ${sessionId}`, dataToUpdate);
    } else {
        console.warn(`[SessionService] Attempted to update non-existent session ID: ${sessionId}`);
    }
};

/**
 * Adds messages to the session history, maintaining a limit.
 * 
 * @param {string} sessionId 
 * @param {Object} userMessage 
 * @param {Object} botMessage 
 */
export const addMessagesToSession = (sessionId, userMessage, botMessage) => {
    const session = sessions.get(sessionId);
    if (session) {
        session.messages.push(userMessage);
        session.messages.push(botMessage);

        // Keep only the last N messages (e.g., 10)
        const maxHistory = 10;
        if (session.messages.length > maxHistory) {
            session.messages = session.messages.slice(-maxHistory);
        }
        session.lastActivity = Date.now(); // Update activity
    } else {
         console.warn(`[SessionService] Attempted to add messages to non-existent session ID: ${sessionId}`);
    }
};

// Optional: Function to manually get a session without creating it
export const getSession = (sessionId) => {
    return sessions.get(sessionId);
}; 