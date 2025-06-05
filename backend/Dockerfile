# Use the official Playwright image which includes browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of your code
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the application
CMD ["node", "server.js"] 