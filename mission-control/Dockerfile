FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src ./src
COPY public ./public
COPY config ./config

# Expose port
EXPOSE 3100

# Start server
CMD ["node", "src/server.js"]
