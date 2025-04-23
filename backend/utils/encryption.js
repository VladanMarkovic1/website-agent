import crypto from 'crypto';

// Ensure LEAD_ENCRYPTION_KEY is set in your environment variables
// It must be a 32-byte (256-bit) key for AES-256
const ENCRYPTION_KEY = process.env.LEAD_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc'; // Use a standard algorithm

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
    console.error("FATAL ERROR: LEAD_ENCRYPTION_KEY environment variable is missing, invalid, or not 32 bytes (64 hex characters).");
    // In a real app, you might want to prevent startup
    // process.exit(1); 
}

/**
 * Encrypts text using AES-256-CBC.
 * Generates a random IV for each encryption.
 * @param {string} text - The text to encrypt.
 * @returns {{ iv: string, encryptedData: string } | null} - The IV and encrypted data (hex), or null on error/invalid input.
 */
export const encrypt = (text) => {
    if (text === null || typeof text === 'undefined') {
        console.warn("[Encryption] Attempted to encrypt null or undefined value.");
        return null;
    }
    
    const textString = String(text); 
    if (!textString) {
         console.warn("[Encryption] Attempted to encrypt an empty string.");
         return { iv: '', encryptedData: ''}; 
    }

    try {
        const iv = crypto.randomBytes(16); 
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(textString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return { 
            iv: iv.toString('hex'), 
            encryptedData: encrypted 
        };
    } catch (error) {
        console.error("[Encryption] Encryption failed:", error);
        // Return null or throw, depending on desired handling in pre-save hook
        return null; 
    }
};

/**
 * Decrypts text using AES-256-CBC.
 * @param {string} encryptedData - The hex encoded encrypted data.
 * @param {string} iv - The hex encoded initialization vector.
 * @returns {string | null} - The decrypted text, or null if decryption fails or input is invalid.
 */
export const decrypt = (encryptedData, iv) => {
    if (!encryptedData || !iv) {
        return encryptedData === '' ? '' : null; 
    }

    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("[Encryption] Decryption failed:", error.message); 
        return null; 
    }
}; 