#Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

#copy package json files
COPY package*.json ./

#Install Dependencies
RUN npm install --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

#copy  node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY . . 

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs


# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3006

CMD ["node", "index.js"]