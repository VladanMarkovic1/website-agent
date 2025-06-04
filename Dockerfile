# Use the official Playwright image with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

# Copy the rest of your backend code (excluding node_modules)
COPY backend/ .

# Make sure we exclude copying node_modules from local
RUN rm -rf node_modules && npm ci

# Expose the port your app runs on
EXPOSE 5000

# Start the server
CMD ["node", "server.js"] 