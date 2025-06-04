# Use the official Playwright image with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install Playwright browsers and dependencies
RUN npx playwright install --with-deps

# Copy the rest of your code
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"] 