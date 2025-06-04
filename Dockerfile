# Use the official Playwright image with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies first
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# Copy all backend files except node_modules
COPY backend/*.js ./
COPY backend/scraper/ ./scraper/
COPY backend/routes/ ./routes/
COPY backend/utils/ ./utils/
COPY backend/models/ ./models/
COPY backend/controllers/ ./controllers/
COPY backend/middleware/ ./middleware/
COPY backend/config/ ./config/

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"] 