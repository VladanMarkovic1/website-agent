# Dashboard Environment Configuration

## 🔧 Required Environment Variables

The dashboard requires environment variables to connect to your backend API. Follow these steps to set up your environment:

### 1. Create Environment File

Create a `.env` file in the `dashboard/` directory:

```bash
# Copy the example file (if you have one)
cp .env.example .env

# Or create manually
touch .env
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:5000/api/v1

# Production example:
# VITE_BACKEND_URL=https://api.yourdomain.com/api/v1
```

## 🌍 Environment-Specific URLs

### Development
```bash
VITE_BACKEND_URL=http://localhost:5000/api/v1
```

### Production
```bash
VITE_BACKEND_URL=https://your-backend-domain.com/api/v1
```

### Staging
```bash
VITE_BACKEND_URL=https://staging-api.yourdomain.com/api/v1
```

## 🔍 How It Works

The dashboard uses Vite's environment variable system:

- All frontend environment variables must start with `VITE_`
- Variables are loaded at build time
- Fallback to localhost for development

### Code Implementation:
```javascript
// Automatically uses environment variable with fallback
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/v1';
```

## 🚀 Deployment

### For Render/Vercel/Netlify:
Set environment variables in your hosting platform:
- **Variable Name**: `VITE_BACKEND_URL`
- **Value**: `https://your-backend-domain.com/api/v1`

### For Docker:
```bash
docker build --build-arg VITE_BACKEND_URL=https://api.yourdomain.com/api/v1 .
```

## ⚠️ Important Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use HTTPS in production** - HTTP will cause CORS issues
3. **Include `/api/v1`** - Match your backend route structure
4. **Test the connection** - Check browser console for API errors

## 🔧 Troubleshooting

### Common Issues:

**API calls failing?**
- Check browser console for CORS errors
- Verify backend URL is accessible
- Ensure `/api/v1` suffix is included

**Environment variables not loading?**
- Restart development server after changing `.env`
- Ensure variable starts with `VITE_`
- Check for typos in variable names

### Testing Your Setup:
```bash
# Start development server
npm run dev

# Check console logs for:
# "🔗 API Base URL: your-backend-url"
# "📞 Call Tracking API Base URL: your-backend-url"
# "🔌 Socket Service initialized with URL: your-backend-url"
```

## 📝 Example .env File

```bash
# Dashboard Environment Variables
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:5000/api/v1

# Optional: Alternative variable name (VITE_BACKEND_URL takes precedence)
# VITE_API_BASE_URL=http://localhost:5000/api/v1
``` 