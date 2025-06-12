import fs from 'fs';
import path from 'path';

/**
 * Security Event Logger
 * Logs security-related events for monitoring and compliance
 */

// Security log levels
export const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN', 
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
};

// Security event types
export const EVENT_TYPES = {
    AUTH_SUCCESS: 'AUTH_SUCCESS',
    AUTH_FAILURE: 'AUTH_FAILURE',
    RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
    CSRF_FAILURE: 'CSRF_FAILURE',
    DATA_ACCESS: 'DATA_ACCESS',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    SMS_SENT: 'SMS_SENT',
    PHONE_ACCESS: 'PHONE_ACCESS'
};

/**
 * Log security event
 */
export const logSecurityEvent = (eventType, level, details, req = null) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            eventType,
            level,
            details,
            ...(req && {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                businessId: req.user?.businessId,
                method: req.method,
                url: req.originalUrl,
                sessionId: req.sessionID
            })
        };

        // Console logging
        const logMessage = `[${timestamp}] ${level}: ${eventType} - ${JSON.stringify(details)}`;
        
        switch (level) {
            case LOG_LEVELS.CRITICAL:
            case LOG_LEVELS.ERROR:
                console.error('🚨', logMessage);
                break;
            case LOG_LEVELS.WARN:
                console.warn('⚠️', logMessage);
                break;
            default:
                console.log('ℹ️', logMessage);
        }

        // File logging (in production, consider using proper logging service)
        if (process.env.NODE_ENV === 'production') {
            writeToSecurityLog(logEntry);
        }

        // Alert on critical events
        if (level === LOG_LEVELS.CRITICAL) {
            sendSecurityAlert(logEntry);
        }

    } catch (error) {
        console.error('❌ Security logging failed:', error.message);
    }
};

/**
 * Write to security log file
 */
const writeToSecurityLog = (logEntry) => {
    try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFileSync(logFile, logLine);
    } catch (error) {
        console.error('❌ Failed to write security log:', error.message);
    }
};

/**
 * Send security alert for critical events
 */
const sendSecurityAlert = (logEntry) => {
    // In production, integrate with monitoring service (PagerDuty, Slack, etc.)
    console.error('🚨 CRITICAL SECURITY EVENT:', logEntry);
    
    // TODO: Implement actual alerting
    // - Email notifications
    // - Slack webhook
    // - PagerDuty incident
    // - SMS alerts
};

/**
 * Log authentication events
 */
export const logAuthEvent = (success, details, req) => {
    logSecurityEvent(
        success ? EVENT_TYPES.AUTH_SUCCESS : EVENT_TYPES.AUTH_FAILURE,
        success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN,
        details,
        req
    );
};

/**
 * Log rate limiting events
 */
export const logRateLimitEvent = (details, req) => {
    logSecurityEvent(
        EVENT_TYPES.RATE_LIMIT_HIT,
        LOG_LEVELS.WARN,
        details,
        req
    );
};

/**
 * Log CSRF protection events
 */
export const logCSRFEvent = (details, req) => {
    logSecurityEvent(
        EVENT_TYPES.CSRF_FAILURE,
        LOG_LEVELS.ERROR,
        details,
        req
    );
};

/**
 * Log sensitive data access
 */
export const logDataAccess = (dataType, action, details, req) => {
    logSecurityEvent(
        EVENT_TYPES.DATA_ACCESS,
        LOG_LEVELS.INFO,
        {
            dataType,
            action,
            ...details
        },
        req
    );
};

/**
 * Log suspicious activity
 */
export const logSuspiciousActivity = (details, req) => {
    logSecurityEvent(
        EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        LOG_LEVELS.CRITICAL,
        details,
        req
    );
};

/**
 * Log SMS sending for audit purposes
 */
export const logSMSEvent = (phoneNumber, businessId, details, req) => {
    logSecurityEvent(
        EVENT_TYPES.SMS_SENT,
        LOG_LEVELS.INFO,
        {
            phoneNumber: phoneNumber ? phoneNumber.replace(/\d(?=\d{4})/g, '*') : null, // Mask phone number
            businessId,
            ...details
        },
        req
    );
};

/**
 * Log phone number access
 */
export const logPhoneAccess = (action, phoneCount, req) => {
    logSecurityEvent(
        EVENT_TYPES.PHONE_ACCESS,
        LOG_LEVELS.INFO,
        {
            action,
            phoneCount,
            timestamp: new Date().toISOString()
        },
        req
    );
};

/**
 * Middleware to log all API requests
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const details = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };

        // Log suspicious patterns
        if (duration > 5000) { // Slow requests
            logSecurityEvent('SLOW_REQUEST', LOG_LEVELS.WARN, details, req);
        }

        if (res.statusCode >= 400) { // Error responses
            logSecurityEvent('ERROR_RESPONSE', LOG_LEVELS.WARN, details, req);
        }
    });
    
    next();
}; 