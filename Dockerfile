# Use the official Playwright image with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies first
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# Copy all backend source code (node_modules excluded by .dockerignore)
COPY backend/ ./

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"] 