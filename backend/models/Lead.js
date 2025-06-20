import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js"; // Import encryption utils

const leadSchema = new mongoose.Schema({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    name: { 
        type: String,
        required: true
    },
    nameIv: { // IV for name
        type: String,
        required: false // Not required if name is empty/null
    },
    phone: { 
        type: String,
        required: true
    },
    phoneIv: { // IV for phone
        type: String,
        required: false // Not required if phone is empty/null
    },
    email: { 
        type: String,
        required: false
    },
    emailIv: { // IV for email
        type: String,
        required: false // Not required if email is empty/null or not provided
    },
    service: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'attempted-contact', 'contacted', 'scheduled', 'completed', 'no-response'],
        default: 'new'
    },
    bestTimeToCall: {
        type: String,
        enum: ['now', 'next-business-day', 'morning', 'afternoon', 'evening'],
        default: 'now'
    },
    emailHistory: [{
        type: {
            type: String,
            enum: ['confirmation', 'followUp', 'reminder'],
            required: true
        },
        sentAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['sent', 'failed', 'opened', 'clicked'],
            default: 'sent'
        },
        emailId: String,
        previewUrl: String,
        template: String,
        error: String
    }],
    emailCommunication: {
        lastEmailSent: Date,
        totalEmailsSent: {
            type: Number,
            default: 0
        },
        hasResponded: {
            type: Boolean,
            default: false
        },
        unsubscribed: {
            type: Boolean,
            default: false
        },
        nextScheduledEmail: Date
    },
    callHistory: [{
        status: String,
        notes: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastContactedAt: {
        type: Date,
        default: Date.now
    },
    scheduledConsultation: {
        date: Date,
        confirmed: {
            type: Boolean,
            default: false
        },
        notes: String,
        remindersSent: [{
            type: Date
        }]
    },
    interactions: [{
        type: {
            type: String,
            enum: ['email', 'call', 'sms', 'consultation', 'chatbot', 'Status Update'],
            required: true
        },
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: String,
        message: String,
        service: String
    }],
    details: {
        type: Object,
        required: false,
        default: {}
    }
}, {
    // Ensure getters are applied when converting to JSON/Object
    toJSON: { getters: true }, 
    toObject: { getters: true } 
});

// --- Encryption Hook ---
leadSchema.pre('save', function(next) {
    // console.log(`[Pre-Save Hook] Running for Lead ID: ${this._id || 'NEW'}`); // REMOVED
    try {
        // Encrypt Name if modified
        if (this.isModified('name')) {
            // console.log(`[Pre-Save Hook] Name modified. Original value:`, this.name); // REMOVED
            if (this.name != null) {
                const encryptedName = encrypt(this.name);
                // console.log(`[Pre-Save Hook] encrypt(name) result:`, encryptedName); // REMOVED
                if (encryptedName) {
                    this.set('name', encryptedName.encryptedData);
                    this.set('nameIv', encryptedName.iv);
                    // console.log(`[Pre-Save Hook] Name set to encrypted. IV set.`); // REMOVED
                } else {
                    if (this.name === '') { this.set('nameIv', ''); /* console.log(`[Pre-Save Hook] Name is empty string, IV set to empty.`); */ } // REMOVED
                    else { console.error('[Pre-Save Hook] Name encryption failed!'); this.invalidate('name', 'Encryption failed'); } // KEEP Error
                }
            } else {
                 // console.log(`[Pre-Save Hook] Name is null/undefined, clearing IV.`); // REMOVED
                 this.set('nameIv', undefined);
            }
        } else {
             // console.log(`[Pre-Save Hook] Name not modified.`); // REMOVED
        }
        
        // Encrypt Email if modified
        if (this.isModified('email')) {
            // console.log(`[Pre-Save Hook] Email modified. Original value:`, this.email); // REMOVED
            if (this.email != null) {
                const encryptedEmail = encrypt(this.email);
                // console.log(`[Pre-Save Hook] encrypt(email) result:`, encryptedEmail); // REMOVED
                if (encryptedEmail) {
                    this.set('email', encryptedEmail.encryptedData);
                    this.set('emailIv', encryptedEmail.iv);
                    // console.log(`[Pre-Save Hook] Email set to encrypted. IV set.`); // REMOVED
                } else {
                     if (this.email === '') { this.set('emailIv', ''); /* console.log(`[Pre-Save Hook] Email is empty string, IV set to empty.`); */ } // REMOVED
                     else { console.error('[Pre-Save Hook] Email encryption failed!'); this.invalidate('email', 'Encryption failed'); } // KEEP Error
                }
            } else {
                 // console.log(`[Pre-Save Hook] Email is null/undefined, clearing IV.`); // REMOVED
                 this.set('emailIv', undefined);
            }
        } else {
             // console.log(`[Pre-Save Hook] Email not modified.`); // REMOVED
        }

        // Encrypt Phone if modified
        if (this.isModified('phone')) {
             // console.log(`[Pre-Save Hook] Phone modified. Original value:`, this.phone); // REMOVED
             if (this.phone != null) {
                 const encryptedPhone = encrypt(this.phone);
                 // console.log(`[Pre-Save Hook] encrypt(phone) result:`, encryptedPhone); // REMOVED
                 if (encryptedPhone) {
                     this.set('phone', encryptedPhone.encryptedData);
                     this.set('phoneIv', encryptedPhone.iv);
                     // console.log(`[Pre-Save Hook] Phone set to encrypted. IV set.`); // REMOVED
                 } else {
                     if (this.phone === '') { this.set('phoneIv', ''); /* console.log(`[Pre-Save Hook] Phone is empty string, IV set to empty.`); */ } // REMOVED
                     else { console.error('[Pre-Save Hook] Phone encryption failed!'); this.invalidate('phone', 'Encryption failed'); } // KEEP Error
                 }
             } else {
                  // console.log(`[Pre-Save Hook] Phone is null/undefined, clearing IV.`); // REMOVED
                  this.set('phoneIv', undefined);
             }
        } else {
              // console.log(`[Pre-Save Hook] Phone not modified.`); // REMOVED
        }
        
        // console.log('[Pre-Save Hook] Hook finished. Calling next().'); // REMOVED
        next();
    } catch (error) {
        console.error("Error during pre-save encryption hook:", error); // KEEP Error
        next(error); 
    }
});

// --- Indexes ---
leadSchema.index({ businessId: 1, createdAt: -1 });
leadSchema.index({ status: 1, lastContactedAt: 1 });
// leadSchema.index({ phone: 1, businessId: 1 }, { unique: true }); // CANNOT use unique index on encrypted field
// leadSchema.index({ email: 1, businessId: 1 }, { unique: true }); // CANNOT use unique index on encrypted field
// Consider adding index on a hashed version of phone/email for duplicate checks if needed
leadSchema.index({ 'emailCommunication.nextScheduledEmail': 1 });
leadSchema.index({ 'emailCommunication.lastEmailSent': 1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
