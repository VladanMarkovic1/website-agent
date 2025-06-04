# Use the official Playwright image with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

# Copy the rest of your backend code
COPY backend/ .

# Expose the port your app runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"] 