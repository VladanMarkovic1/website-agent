# CSRF Protection Implementation

## 🔒 Overview

This dashboard now includes comprehensive CSRF (Cross-Site Request Forgery) protection for all state-changing operations in the call tracking system.

## 📋 What's Implemented

### 1. **Automatic CSRF Protection**
- ✅ **Auto-token management**: Tokens fetched and refreshed automatically
- ✅ **Axios interceptors**: CSRF tokens added to POST/PUT/DELETE requests
- ✅ **Error handling**: Automatic retry on CSRF failures
- ✅ **Token caching**: Efficient token reuse until expiration

### 2. **Services & Hooks**
- ✅ **CSRFService**: Core token management service
- ✅ **useCSRF hook**: React hook for token state management  
- ✅ **useProtectedAPI hook**: Hook for protected API calls
- ✅ **Auth integration**: Token clearing on logout

### 3. **UI Components**
- ✅ **CSRFStatus**: Visual indicator of protection status
- ✅ **CSRFBadge**: Compact status badge for headers
- ✅ **Error handling**: User-friendly error messages

## 🚀 How It Works

### **For Developers (Transparent)**

CSRF protection is **completely automatic** for most use cases:

```javascript
// This SMS sending is automatically protected
await sendManualSMS(businessId, phoneNumber, message);

// The interceptor automatically adds the CSRF token header:
// 'X-CSRF-Token': 'abc123def456...'
```

### **For Advanced Use Cases**

```javascript
import { useCSRF, useProtectedAPI } from '../hooks/useCSRF';

const MyComponent = () => {
    const { token, loading, error } = useCSRF();
    const { executeProtectedCall } = useProtectedAPI();
    
    const handleProtectedAction = async () => {
        try {
            await executeProtectedCall(sendManualSMS, businessId, phone, message);
        } catch (error) {
            console.error('Protected call failed:', error);
        }
    };
};
```

## 🔄 Token Lifecycle

1. **On App Load**: CSRF token fetched automatically
2. **Before Each Request**: Token validated and refreshed if needed
3. **On Auth Failure**: Token cleared automatically
4. **On Logout**: Token cleared explicitly
5. **Auto-Refresh**: Token refreshed every 30 minutes

## 📊 Monitoring CSRF Protection

### **Visual Indicators**

```jsx
import CSRFStatus, { CSRFBadge } from '../components/common/CSRFStatus';

// Detailed status panel
<CSRFStatus showDetails={true} />

// Compact badge for nav
<CSRFBadge />
```

### **Status States**
- 🟢 **Protected**: CSRF token active and valid
- 🔵 **Loading**: Fetching or refreshing token
- 🔴 **Error**: Failed to obtain token
- 🟡 **Unavailable**: No token available

## 🛠️ Configuration

### **Environment Variables**
```bash
# Backend URL for CSRF token endpoint
VITE_BACKEND_URL=http://localhost:5000
```

### **Service Configuration**
The CSRF service automatically configures itself based on your backend URL and uses the same auth tokens.

## 🔒 Security Features

### **Built-in Protections**
- **Single-use tokens**: Each token can only be used once
- **Time-based expiration**: Tokens expire after 2 hours
- **User/business validation**: Tokens tied to specific users
- **Automatic cleanup**: Expired tokens removed automatically

### **Attack Prevention**
- **CSRF attacks**: Malicious sites can't forge requests
- **Token replay**: Single-use prevents reuse
- **Session hijacking**: IP validation in production
- **Token theft**: Short expiration limits damage

## 🧪 Testing CSRF Protection

### **Manual Testing**
1. Open browser dev tools
2. Go to Network tab
3. Send an SMS message
4. Verify `X-CSRF-Token` header is present

### **Error Testing**
1. Manually delete CSRF token from memory
2. Try to send SMS
3. Should see automatic retry with new token

### **Console Monitoring**
```javascript
// Monitor CSRF events in browser console
🔄 Refreshing CSRF token...
✅ CSRF token refreshed successfully
🔄 CSRF error, refreshing token and retrying...
```

## 🚨 Troubleshooting

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| "CSRF token required" | Token not loaded | Wait for token to load |
| "Invalid CSRF token" | Token expired | Automatic retry should work |
| "Token user mismatch" | Auth issue | Re-login |
| Network errors | Backend down | Check backend status |

### **Debug Mode**
Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('csrf-debug', 'true');
// Reload page to see detailed CSRF logs
```

## 📈 Performance Impact

- **Token size**: ~64 characters (~64 bytes)
- **Storage**: In-memory only (not localStorage)
- **Network overhead**: +1 header per protected request
- **Caching**: Efficient reuse until expiration

## 🔄 Migration Guide

### **Existing Code**
Most existing code works without changes:

```javascript
// Before: This worked
await sendManualSMS(businessId, phoneNumber, message);

// After: This still works (now with CSRF protection)
await sendManualSMS(businessId, phoneNumber, message);
```

### **Manual Integration**
For custom API calls:

```javascript
// Before
const response = await axios.post('/api/call-tracking/send-sms', data);

// After (automatic with interceptor)
const response = await callTrackingApi.post('/send-sms', data);
```

## 🎯 Best Practices

1. **Use existing services**: Stick to `callTrackingService.js` functions
2. **Monitor status**: Include `<CSRFBadge />` in headers
3. **Handle errors**: Use try/catch for protected operations
4. **Test thoroughly**: Verify CSRF headers in network tab
5. **Report issues**: Log any CSRF-related errors

## 📞 Support

If you encounter CSRF-related issues:
1. Check browser console for error messages
2. Verify backend is running and accessible
3. Ensure you're logged in with valid auth token
4. Try refreshing the page to reset CSRF state

---

**CSRF Protection Status: ✅ Active and Monitoring** 