import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing operations
 */

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map();

// Clean up expired tokens every hour
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tokenStore.entries()) {
        if (now > data.expires) {
            tokenStore.delete(token);
        }
    }
}, 60 * 60 * 1000); // 1 hour

/**
 * Generate CSRF token
 */
export const generateCSRFToken = (req, res, next) => {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
        
        // Store token with user/session info
        tokenStore.set(token, {
            userId: req.user?.id,
            businessId: req.user?.businessId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            expires
        });
        
        // Add token to response
        res.locals.csrfToken = token;
        next();
    } catch (error) {
        console.error('❌ CSRF token generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate CSRF token' });
    }
};

/**
 * Validate CSRF token for state-changing operations
 */
export const validateCSRFToken = (req, res, next) => {
    try {
        // Skip validation for GET, HEAD, OPTIONS requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next();
        }
        
        // Get token from header or body
        const token = req.headers['x-csrf-token'] || req.body.csrfToken;
        
        if (!token) {
            return res.status(403).json({ 
                error: 'CSRF token required',
                code: 'CSRF_TOKEN_MISSING'
            });
        }
        
        // Validate token exists and hasn't expired
        const tokenData = tokenStore.get(token);
        
        if (!tokenData) {
            return res.status(403).json({ 
                error: 'Invalid CSRF token',
                code: 'CSRF_TOKEN_INVALID'
            });
        }
        
        if (Date.now() > tokenData.expires) {
            tokenStore.delete(token);
            return res.status(403).json({ 
                error: 'CSRF token expired',
                code: 'CSRF_TOKEN_EXPIRED'
            });
        }
        
        // Validate token is for the same user/business
        if (tokenData.userId !== req.user?.id || 
            tokenData.businessId !== req.user?.businessId) {
            return res.status(403).json({ 
                error: 'CSRF token not valid for this user',
                code: 'CSRF_TOKEN_USER_MISMATCH'
            });
        }
        
        // Optional: Validate IP and User-Agent for extra security
        if (process.env.NODE_ENV === 'production') {
            if (tokenData.ip !== req.ip) {
                console.warn('⚠️ CSRF token IP mismatch:', {
                    tokenIP: tokenData.ip,
                    requestIP: req.ip,
                    userId: req.user?.id
                });
            }
        }
        
        // Token is valid - remove it (single use)
        tokenStore.delete(token);
        next();
        
    } catch (error) {
        console.error('❌ CSRF token validation error:', error.message);
        res.status(500).json({ error: 'CSRF validation failed' });
    }
};

/**
 * Get CSRF token endpoint
 */
export const getCSRFToken = (req, res) => {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
        
        // Store token
        tokenStore.set(token, {
            userId: req.user?.id,
            businessId: req.user?.businessId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            expires
        });
        
        res.json({
            success: true,
            csrfToken: token,
            expires: new Date(expires).toISOString()
        });
        
    } catch (error) {
        console.error('❌ CSRF token generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate CSRF token' });
    }
}; 