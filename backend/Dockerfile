# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (including dev for potential build steps)
RUN npm ci

# Copy source code for any build steps
COPY . .


# Stage 2: Production image
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# 🔒 DOWNLOAD AWS RDS SSL ROOT CERTIFICATE
RUN apk add --no-cache curl && \
    curl -sS https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/global-bundle.pem

# Copy application code from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/knexfile.js ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seeds ./seeds

# Change ownership to non-root user
RUN chown -R nodeapp:nodejs /app

USER nodeapp

# Expose application port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "npm run migrate && npm start"]