# Development environment for Next.js frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV NEXT_TELEMETRY_DISABLED 1

# Default command (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev"]

